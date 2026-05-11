import { db } from "./db";
import { users, artistProfiles } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create sample artists
    const artists = [
      {
        username: "makeup_master",
        password: "password123",
        email: "makeup@beauvette.com",
        role: "artist",
        fullName: "Sophia Martinez"
      },
      {
        username: "hair_guru",
        password: "password123",
        email: "hair@beauvette.com",
        role: "artist",
        fullName: "Emma Williams"
      },
      {
        username: "bridal_beauty",
        password: "password123",
        email: "bridal@beauvette.com",
        role: "artist",
        fullName: "Isabella Chen"
      }
    ];

    for (const artist of artists) {
      const [createdUser] = await db.insert(users).values([artist]).returning();
      
      // Create profile for each artist
      let profileData: any = {
        userId: createdUser.id,
      };

      if (artist.username === "makeup_master") {
        profileData = {
          ...profileData,
          businessName: "Sophia Martinez Beauty",
          bio: "Award-winning makeup artist specializing in bridal and editorial looks. 10+ years of experience creating flawless, camera-ready makeup.",
          location: "Los Angeles, CA",
          specialties: ["bridal", "editorial", "airbrush"],
          portfolioUrls: ["https://images.unsplash.com/photo-1487412947147-5cebf100ffc2"]
        };
      } else if (artist.username === "hair_guru") {
        profileData = {
          ...profileData,
          businessName: "Emma's Hair Artistry",
          bio: "Certified hair stylist with expertise in updos, extensions, and modern bridal styles. Passionate about creating timeless, elegant looks.",
          location: "New York, NY",
          specialties: ["bridal", "updos", "extensions"],
          portfolioUrls: ["https://images.unsplash.com/photo-1560066984-138dadb4c035"]
        };
      } else if (artist.username === "bridal_beauty") {
        profileData = {
          ...profileData,
          businessName: "Isabella Chen Studio",
          bio: "Full-service beauty studio offering hair and makeup for weddings and special events. Creating beautiful, confident brides since 2015.",
          location: "San Francisco, CA",
          specialties: ["bridal", "hair styling", "makeup"],
          portfolioUrls: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e"]
        };
      }

      await db.insert(artistProfiles).values([profileData]);
    }

    // Create a sample client
    await db.insert(users).values([{
      username: "client_jane",
      password: "password123",
      email: "jane@example.com",
      role: "client",
      fullName: "Jane Doe"
    }]);

    // Create a sample planner
    await db.insert(users).values([{
      username: "planner_pro",
      password: "password123",
      email: "planner@beauvette.com",
      role: "planner",
      fullName: "Victoria Rodriguez"
    }]);

    // Create admin
    await db.insert(users).values([{
      username: "admin",
      password: "admin123",
      email: "admin@beauvette.com",
      role: "admin",
      fullName: "Admin User"
    }]);

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
