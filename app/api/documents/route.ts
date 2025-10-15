import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Binary } from "mongodb";
import type {
  ExportedDocument,
  BookMetadata,
  BookMetadataSerializable,
} from "@/lib/types";

// Helper function to convert File to data URL
async function convertFileToDataUrl(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "application/octet-stream";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return dataUrl;
  } catch (error) {
    console.error("Error in convertFileToDataUrl:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = JSON.parse(formData.get("metadata") as string);
    const storiesCount = parseInt(formData.get("storiesCount") as string);
    const fullPageImage = formData.get("fullPageImage") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert metadata to serializable format
    const serializableMetadata: BookMetadataSerializable = {
      ...metadata,
      fullPageImageDataUrl: fullPageImage
        ? await convertFileToDataUrl(fullPageImage)
        : undefined,
    };
    // Remove the File object from metadata
    delete (serializableMetadata as any).fullPageImage;

    const db = await getDb();
    const collection = db.collection<ExportedDocument>("documents");

    const document: Omit<ExportedDocument, "_id"> = {
      filename: file.name,
      title: metadata.title,
      language: metadata.language,
      author: metadata.author,
      createdAt: new Date(),
      fileData: new Binary(buffer),
      metadata: serializableMetadata,
      storiesCount,
    };

    const result = await collection.insertOne(document);

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      message: "Document saved successfully",
    });
  } catch (error) {
    console.error("Error saving document:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection<ExportedDocument>("documents");

    const documents = await collection
      .find({}, { projection: { fileData: 0 } }) // Exclude fileData from list
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
