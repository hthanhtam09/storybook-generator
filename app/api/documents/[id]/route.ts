import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId, Binary, GridFSBucket } from "mongodb";
import type { ExportedDocument } from "@/lib/types";

// Configure the API route
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds timeout

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection<ExportedDocument>("documents");

    const document = await collection.findOne({ _id: new ObjectId(id) });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Return the file as a download
    if (document.fileStorage === "gridfs" && document.fileDataId) {
      const db = await getDb();
      const bucket = new GridFSBucket(db, { bucketName: "documents" });
      const downloadStream = bucket.openDownloadStream(
        new ObjectId(document.fileDataId)
      );

      const chunks: Uint8Array[] = [];
      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk) => chunks.push(chunk));
        downloadStream.on("error", (err) => reject(err));
        downloadStream.on("end", () => resolve());
      });

      const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${document.filename}"`,
        },
      });
    }

    const fileData =
      document.fileData instanceof Binary
        ? document.fileData.buffer
        : document.fileData;

    return new NextResponse(new Uint8Array(fileData), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${document.filename}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection<ExportedDocument>("documents");

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
