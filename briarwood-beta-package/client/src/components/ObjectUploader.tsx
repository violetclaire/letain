import { useState, useRef } from "react";
import type { ReactNode, ChangeEvent } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (maxFileSize && file.size > maxFileSize) {
      alert(`File size exceeds maximum allowed (${Math.round(maxFileSize / 1024 / 1024)}MB)`);
      return;
    }

    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const isAllowed = allowedFileTypes.some((type) => {
        if (type.endsWith("/*")) {
          const category = type.replace("/*", "");
          return file.type.startsWith(category);
        }
        return file.type === type;
      });
      if (!isAllowed) {
        alert("File type not allowed");
        return;
      }
    }

    setUploading(true);

    try {
      const uppy = new Uppy({
        restrictions: {
          maxNumberOfFiles,
          maxFileSize,
          allowedFileTypes,
        },
        autoProceed: true,
      }).use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      });

      uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
      });

      const result = await uppy.upload();
      onComplete?.(result);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const acceptTypes = allowedFileTypes?.join(",") || "*";

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptTypes}
        className="hidden"
        disabled={uploading}
      />
      <Button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className={buttonClassName}
      >
        {uploading ? "Uploading..." : children}
      </Button>
    </>
  );
}
