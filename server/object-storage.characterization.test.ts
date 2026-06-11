import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable, Writable } from "node:stream";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = {
  method: string;
  path: string;
  handlers: Handler[];
};

let objectStorageClient: any;
let ObjectStorageService: any;
let ObjectPermission: any;
let canAccessObject: any;
let getObjectAclPolicy: any;
let setObjectAclPolicy: any;
let uploadObjectHandler: Handler;
let getObjectHandler: Handler;
let putProfileImageHandler: Handler;
let storage: any;

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

function oidcDiscoveryDocument() {
  return {
    issuer: "https://replit.com/oidc",
    authorization_endpoint: "https://replit.com/oidc/auth",
    token_endpoint: "https://replit.com/oidc/token",
    jwks_uri: "https://replit.com/oidc/jwks",
    userinfo_endpoint: "https://replit.com/oidc/userinfo",
    end_session_endpoint: "https://replit.com/oidc/logout",
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile", "offline_access"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    claims_supported: ["sub", "email", "first_name", "last_name", "profile_image_url"],
    code_challenge_methods_supported: ["S256"],
  };
}

function createRecordingApp(): Express & { routes: RouteRecord[] } {
  const routes: RouteRecord[] = [];
  const app = (() => undefined) as any;

  app.routes = routes;
  app.set = () => app;
  app.use = () => app;

  for (const method of ["get", "post", "put", "patch", "delete", "options", "all"]) {
    app[method] = (path: string, ...handlers: Handler[]) => {
      routes.push({ method, path, handlers });
      return app;
    };
  }

  return app;
}

function createResponse() {
  let statusCode = 200;
  let body: unknown;
  const headers: Record<string, string | number | undefined> = {};

  const res = {
    set(values: Record<string, string | number | undefined>) {
      Object.assign(headers, values);
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
    sendStatus(code: number) {
      statusCode = code;
      return res;
    },
  };

  return {
    res,
    result() {
      return { statusCode, body, headers };
    },
  };
}

function createWritableResponse() {
  const headers: Record<string, string | number | undefined> = {};
  const chunks: Buffer[] = [];
  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  }) as Writable & {
    set: (values: Record<string, string | number | undefined>) => unknown;
    status: (code: number) => unknown;
    json: (payload: unknown) => unknown;
    headersSent: boolean;
    statusCode?: number;
    body?: unknown;
  };

  res.headersSent = false;
  res.set = (values) => {
    Object.assign(headers, values);
    return res;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };

  return {
    res,
    result() {
      return {
        headers,
        body: res.body,
        statusCode: res.statusCode ?? 200,
        streamedBody: Buffer.concat(chunks).toString("utf8"),
      };
    },
  };
}

function createFakeFile({
  exists = true,
  metadata = {},
  streamBody = "file-body",
}: {
  exists?: boolean;
  metadata?: Record<string, any>;
  streamBody?: string;
} = {}) {
  let storedMetadata: Record<string, any> = {
    contentType: "application/octet-stream",
    size: Buffer.byteLength(streamBody),
    metadata: {},
    ...metadata,
  };
  const writes: {
    setMetadata: Record<string, any>[];
    save: Array<{ buffer: Buffer; options: Record<string, any> }>;
  } = {
    setMetadata: [],
    save: [],
  };

  return {
    name: "private-root/object.txt",
    writes,
    async exists() {
      return [exists];
    },
    async getMetadata() {
      return [storedMetadata];
    },
    async setMetadata(nextMetadata: Record<string, any>) {
      writes.setMetadata.push(nextMetadata);
      storedMetadata = {
        ...storedMetadata,
        ...nextMetadata,
        metadata: {
          ...(storedMetadata.metadata ?? {}),
          ...(nextMetadata.metadata ?? {}),
        },
      };
    },
    async save(buffer: Buffer, options: Record<string, any>) {
      writes.save.push({ buffer, options });
    },
    createReadStream() {
      return Readable.from([streamBody]);
    },
    get storedMetadata() {
      return storedMetadata;
    },
  };
}

function policyMetadata(policy: Record<string, unknown>) {
  return {
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(policy),
    },
  };
}

function stubObjectStorageFile(fakeFile: any, calls: Array<{ bucketName: string; objectName: string }> = []) {
  mock.method(objectStorageClient, "bucket", (bucketName: string) => ({
    file(objectName: string) {
      calls.push({ bucketName, objectName });
      return fakeFile;
    },
  }));
  return calls;
}

function setPrivateObjectDir(value = "/private-bucket/private-root") {
  const previous = process.env.PRIVATE_OBJECT_DIR;
  process.env.PRIVATE_OBJECT_DIR = value;
  return () => {
    if (previous === undefined) {
      delete process.env.PRIVATE_OBJECT_DIR;
    } else {
      process.env.PRIVATE_OBJECT_DIR = previous;
    }
  };
}

async function invoke(handler: Handler, reqOverrides: Record<string, unknown> = {}) {
  const { res, result } = createResponse();
  const req = {
    body: {},
    headers: {},
    params: {},
    query: {},
    session: {},
    user: undefined,
    path: "",
    ...reqOverrides,
  };

  await handler(req as Request, res as unknown as Response);
  return result();
}

async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "object-storage-characterization-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/object_storage_characterization_test";
  process.env.REPL_ID = "object-storage-characterization-test";
  process.env.ISSUER_URL = "https://replit.com/oidc";

  mock.method(globalThis, "setInterval", () => ({ unref() {} }) as unknown as NodeJS.Timeout);
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(oidcDiscoveryDocument()), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

  const [routesModule, storageModule, objectStorageModule, objectAclModule] = await Promise.all([
    import("./routes"),
    import("./storage"),
    import("./objectStorage"),
    import("./objectAcl"),
  ]);

  storage = storageModule.storage;
  objectStorageClient = objectStorageModule.objectStorageClient;
  ObjectStorageService = objectStorageModule.ObjectStorageService;
  ObjectPermission = objectAclModule.ObjectPermission;
  canAccessObject = objectAclModule.canAccessObject;
  getObjectAclPolicy = objectAclModule.getObjectAclPolicy;
  setObjectAclPolicy = objectAclModule.setObjectAclPolicy;

  const app = createRecordingApp();
  await routesModule.registerRoutes(app);

  const objectRoute = app.routes.find((record) => record.method === "get" && record.path === "/objects/:objectPath(*)");
  assert.ok(objectRoute, "GET /objects/:objectPath(*) should be registered");
  getObjectHandler = objectRoute.handlers.at(-1) as Handler;

  const uploadRoute = app.routes.find((record) => record.method === "post" && record.path === "/api/objects/upload");
  assert.ok(uploadRoute, "POST /api/objects/upload should be registered");
  uploadObjectHandler = uploadRoute.handlers.at(-1) as Handler;

  const profileImageRoute = app.routes.find((record) => record.method === "put" && record.path === "/api/profile-image");
  assert.ok(profileImageRoute, "PUT /api/profile-image should be registered");
  putProfileImageHandler = profileImageRoute.handlers.at(-1) as Handler;
});

afterEach(() => {
  mock.restoreAll();
});

test("object storage source keeps current route and upload touchpoints", async () => {
  const [routesText, objectStorageText, objectAclText, agentRoutesText, schemaText] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./objectStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("./objectAcl.ts", import.meta.url), "utf8"),
    readFile(new URL("./agentRoutes.ts", import.meta.url), "utf8"),
    readFile(new URL("../shared/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(routesText, /app\.get\("\/objects\/:objectPath\(\*\)", async \(req: Request, res: Response\) => \{[\s\S]*?objectStorageService\.canAccessObjectEntity\([\s\S]*?requestedPermission: ObjectPermission\.READ[\s\S]*?objectStorageService\.downloadObject\(objectFile, res\)/);
  assert.match(routesText, /app\.post\("\/api\/objects\/upload", isAuthenticated, async \(req: Request, res: Response\) => \{[\s\S]*?objectStorageService\.getObjectEntityUploadURL\(\)[\s\S]*?res\.json\(\{ uploadURL \}\)/);
  assert.match(routesText, /app\.put\("\/api\/profile-image", isAuthenticated, async \(req: Request, res: Response\) => \{[\s\S]*?if \(!req\.body\.imageURL\)[\s\S]*?trySetObjectEntityAclPolicy[\s\S]*?visibility: "public"[\s\S]*?storage\.updateUser\(userId, \{ profileImageUrl: objectPath \}\)/);
  assert.match(routesText, /objectService\.uploadBuffer\(objectPath, buffer, mimeType, userId\)/);
  assert.match(routesText, /objectService\.uploadBuffer\(objectPath, buffer, mimeType \|\| 'application\/pdf', userId\)/);
  assert.match(routesText, /objectService\.uploadBuffer\(objectPath, fileBuffer, mimeType\)/);
  assert.match(objectStorageText, /const REPLIT_SIDECAR_ENDPOINT = "http:\/\/127\.0\.0\.1:1106"/);
  assert.match(objectStorageText, /async uploadBuffer\(objectPath: string, buffer: Buffer, mimeType: string, ownerId\?: string\): Promise<string> \{[\s\S]*?cacheControl: 'public, max-age=31536000'[\s\S]*?visibility: 'public'[\s\S]*?return `\/objects\/\$\{cleanPath\}`;/);
  assert.match(objectAclText, /const ACL_POLICY_METADATA_KEY = "custom:aclPolicy"/);
  assert.match(objectAclText, /aclPolicy\.visibility === "public"[\s\S]*?requestedPermission === ObjectPermission\.READ/);
  assert.match(agentRoutesText, /import \{ ObjectStorageService \} from "\.\/objectStorage";[\s\S]*?const objectStorage = new ObjectStorageService\(\);/);
  assert.match(schemaText, /profileImageUrl: varchar\("profile_image_url"\)/);
  assert.match(schemaText, /inspirationPhotos: jsonb\("inspiration_photos"\)/);
  assert.match(schemaText, /attachmentUrls: jsonb\("attachment_urls"\)\.\$type<string\[\]>\(\)/);
});

test("ACL metadata allows public reads without a user but denies private anonymous reads", async () => {
  const publicFile = createFakeFile({
    metadata: policyMetadata({ owner: "artist-a", visibility: "public" }),
  });
  const privateFile = createFakeFile({
    metadata: policyMetadata({ owner: "artist-a", visibility: "private" }),
  });

  assert.equal(await canAccessObject({
    objectFile: publicFile,
    requestedPermission: ObjectPermission.READ,
  }), true);
  assert.equal(await canAccessObject({
    objectFile: privateFile,
    requestedPermission: ObjectPermission.READ,
  }), false);
});

test("ACL metadata grants owner read/write and denies non-owner private access", async () => {
  const privateFile = createFakeFile({
    metadata: policyMetadata({ owner: "artist-a", visibility: "private" }),
  });

  assert.equal(await canAccessObject({
    userId: "artist-a",
    objectFile: privateFile,
    requestedPermission: ObjectPermission.READ,
  }), true);
  assert.equal(await canAccessObject({
    userId: "artist-a",
    objectFile: privateFile,
    requestedPermission: ObjectPermission.WRITE,
  }), true);
  assert.equal(await canAccessObject({
    userId: "artist-b",
    objectFile: privateFile,
    requestedPermission: ObjectPermission.READ,
  }), false);
});

test("ACL helpers persist policy in custom object metadata and reject missing objects", async () => {
  const existingFile = createFakeFile();
  const missingFile = createFakeFile({ exists: false });

  await setObjectAclPolicy(existingFile, { owner: "artist-a", visibility: "public" });
  assert.deepEqual(await getObjectAclPolicy(existingFile), { owner: "artist-a", visibility: "public" });
  assert.equal(existingFile.writes.setMetadata.length, 1);

  await assert.rejects(
    setObjectAclPolicy(missingFile, { owner: "artist-a", visibility: "public" }),
    /Object not found/,
  );
});

test("downloadObject sets public versus private cache headers from ACL policy", async () => {
  const service = new ObjectStorageService();
  const publicFile = createFakeFile({
    metadata: {
      contentType: "image/png",
      size: "9",
      ...policyMetadata({ owner: "artist-a", visibility: "public" }),
    },
    streamBody: "public",
  });
  const privateFile = createFakeFile({
    metadata: {
      contentType: "application/pdf",
      size: "11",
      ...policyMetadata({ owner: "artist-a", visibility: "private" }),
    },
    streamBody: "private",
  });

  const publicResponse = createWritableResponse();
  await service.downloadObject(publicFile, publicResponse.res as unknown as Response);
  assert.deepEqual(publicResponse.result().headers, {
    "Content-Type": "image/png",
    "Content-Length": "9",
    "Cache-Control": "public, max-age=3600",
  });

  const privateResponse = createWritableResponse();
  await service.downloadObject(privateFile, privateResponse.res as unknown as Response, 60);
  assert.deepEqual(privateResponse.result().headers, {
    "Content-Type": "application/pdf",
    "Content-Length": "11",
    "Cache-Control": "private, max-age=60",
  });
});

test("getObjectEntityUploadURL uses private object dir and Replit sidecar signed PUT URL", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  const fetchCalls: Array<{ url: string; body: any }> = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify({ signed_url: "https://signed.example/upload" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  try {
    const uploadURL = await new ObjectStorageService().getObjectEntityUploadURL();

    assert.equal(uploadURL, "https://signed.example/upload");
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, "http://127.0.0.1:1106/object-storage/signed-object-url");
    assert.equal(fetchCalls[0].body.bucket_name, "private-bucket");
    assert.match(fetchCalls[0].body.object_name, /^private-root\/uploads\//);
    assert.equal(fetchCalls[0].body.method, "PUT");
  } finally {
    restorePrivateObjectDir();
  }
});

test("/api/objects/upload returns signed uploadURL from storage service", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ signed_url: "https://signed.example/upload-route" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

  try {
    const result = await invoke(uploadObjectHandler);

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, { uploadURL: "https://signed.example/upload-route" });
  } finally {
    restorePrivateObjectDir();
  }
});

test("Replit sidecar upload signing failure keeps current error behavior", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  mock.method(globalThis, "fetch", async () => new Response("sidecar unavailable", { status: 500 }));

  try {
    await assert.rejects(
      new ObjectStorageService().getObjectEntityUploadURL(),
      /Failed to sign object URL, errorcode: 500, make sure you're running on Replit/,
    );
  } finally {
    restorePrivateObjectDir();
  }
});

test("object entity path normalization maps private GCS URLs to /objects paths and preserves external URLs", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  const service = new ObjectStorageService();

  try {
    assert.equal(
      service.normalizeObjectEntityPath("https://storage.googleapis.com/private-bucket/private-root/profiles/artist.png"),
      "/objects/profiles/artist.png",
    );
    assert.equal(
      service.normalizeObjectEntityPath("https://storage.googleapis.com/other-bucket/private-root/profiles/artist.png"),
      "/other-bucket/private-root/profiles/artist.png",
    );
    assert.equal(
      service.normalizeObjectEntityPath("https://cdn.example.com/profiles/artist.png"),
      "https://cdn.example.com/profiles/artist.png",
    );
  } finally {
    restorePrivateObjectDir();
  }
});

test("trySetObjectEntityAclPolicy normalizes private GCS URLs, verifies existence, and writes ACL", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  const fakeFile = createFakeFile();
  const fileCalls = stubObjectStorageFile(fakeFile);

  try {
    const objectPath = await new ObjectStorageService().trySetObjectEntityAclPolicy(
      "https://storage.googleapis.com/private-bucket/private-root/profiles/artist.png",
      { owner: "artist-a", visibility: "public" },
    );

    assert.equal(objectPath, "/objects/profiles/artist.png");
    assert.deepEqual(fileCalls, [{ bucketName: "private-bucket", objectName: "private-root/profiles/artist.png" }]);
    assert.deepEqual(await getObjectAclPolicy(fakeFile), { owner: "artist-a", visibility: "public" });
  } finally {
    restorePrivateObjectDir();
  }
});

test("uploadBuffer saves under private dir, sets public ACL, and returns /objects path", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  const fakeFile = createFakeFile();
  const fileCalls = stubObjectStorageFile(fakeFile);

  try {
    const servingPath = await new ObjectStorageService().uploadBuffer(
      "/profiles/artist.png",
      Buffer.from("image-bytes"),
      "image/png",
      "artist-a",
    );

    assert.equal(servingPath, "/objects/profiles/artist.png");
    assert.deepEqual(fileCalls, [{ bucketName: "private-bucket", objectName: "private-root/profiles/artist.png" }]);
    assert.equal(fakeFile.writes.save.length, 1);
    assert.equal(fakeFile.writes.save[0].buffer.toString("utf8"), "image-bytes");
    assert.deepEqual(fakeFile.writes.save[0].options, {
      contentType: "image/png",
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });
    assert.deepEqual(await getObjectAclPolicy(fakeFile), { owner: "artist-a", visibility: "public" });
  } finally {
    restorePrivateObjectDir();
  }
});

test("/objects read route allows public objects without user and denies private anonymous reads", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  const publicFile = createFakeFile({
    metadata: policyMetadata({ owner: "artist-a", visibility: "public" }),
    streamBody: "public-file",
  });
  let activeFile = publicFile;
  mock.method(objectStorageClient, "bucket", () => ({
    file() {
      return activeFile;
    },
  }));

  try {
    const publicResponse = createWritableResponse();
    await getObjectHandler(
      { path: "/objects/profiles/artist.png", user: undefined } as unknown as Request,
      publicResponse.res as unknown as Response,
    );
    await flushAsyncWork();
    assert.equal(publicResponse.result().statusCode, 200);
    assert.equal(publicResponse.result().headers["Cache-Control"], "public, max-age=3600");

    activeFile = createFakeFile({
      metadata: policyMetadata({ owner: "artist-a", visibility: "private" }),
    });

    const privateResult = await invoke(getObjectHandler, {
      path: "/objects/contracts/private.pdf",
      user: undefined,
    });
    assert.equal(privateResult.statusCode, 401);
  } finally {
    restorePrivateObjectDir();
  }
});

test("/objects read route uses current OIDC claim user for owner-scoped private access", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  const privateFile = createFakeFile({
    metadata: policyMetadata({ owner: "artist-a", visibility: "private" }),
    streamBody: "private-file",
  });
  stubObjectStorageFile(privateFile);

  try {
    const response = createWritableResponse();
    await getObjectHandler(
      {
        path: "/objects/contracts/private.pdf",
        user: { claims: { sub: "artist-a" } },
      } as unknown as Request,
      response.res as unknown as Response,
    );
    await flushAsyncWork();

    assert.equal(response.result().statusCode, 200);
    assert.equal(response.result().headers["Cache-Control"], "private, max-age=3600");
  } finally {
    restorePrivateObjectDir();
  }
});

test("/api/profile-image requires imageURL and stores normalized public object path", async () => {
  const restorePrivateObjectDir = setPrivateObjectDir();
  const fakeFile = createFakeFile();
  stubObjectStorageFile(fakeFile);
  const updateUserCalls: Array<[string, Record<string, unknown>]> = [];
  mock.method(storage, "updateUser", async (userId: string, data: Record<string, unknown>) => {
    updateUserCalls.push([userId, data]);
    return { id: userId, ...data };
  });

  try {
    const missingResult = await invoke(putProfileImageHandler, {
      session: { userId: "artist-a" },
      body: {},
    });
    const savedResult = await invoke(putProfileImageHandler, {
      session: { userId: "artist-a" },
      body: {
        imageURL: "https://storage.googleapis.com/private-bucket/private-root/profiles/artist.png",
      },
    });

    assert.equal(missingResult.statusCode, 400);
    assert.deepEqual(missingResult.body, { error: "imageURL is required" });
    assert.equal(savedResult.statusCode, 200);
    assert.deepEqual(savedResult.body, {
      objectPath: "/objects/profiles/artist.png",
      success: true,
    });
    assert.deepEqual(updateUserCalls, [["artist-a", { profileImageUrl: "/objects/profiles/artist.png" }]]);
    assert.deepEqual(await getObjectAclPolicy(fakeFile), { owner: "artist-a", visibility: "public" });
  } finally {
    restorePrivateObjectDir();
  }
});
