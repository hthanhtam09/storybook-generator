"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Download,
  Trash2,
  Calendar,
  FileText,
  User,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExportedDocument } from "@/lib/types";

export interface HistoryTabRef {
  refresh: () => void;
}

export const HistoryTab = forwardRef<HistoryTabRef>((props, ref) => {
  const [documents, setDocuments] = useState<ExportedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(
    new Map()
  );

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        throw new Error("Failed to fetch documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load document history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Cleanup thumbnail URLs on unmount
  useEffect(() => {
    return () => {
      thumbnailUrls.forEach((url) => {
        // Only cleanup blob URLs, not data URLs
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [thumbnailUrls]);

  useImperativeHandle(ref, () => ({
    refresh: fetchDocuments,
  }));

  // Generate thumbnail URLs when documents change
  useEffect(() => {
    const newThumbnailUrls = new Map<string, string>();

    documents.forEach((doc) => {
      if (doc.metadata?.fullPageImageDataUrl && doc._id) {
        // Use the data URL directly, no need to create object URL
        newThumbnailUrls.set(
          doc._id.toString(),
          doc.metadata.fullPageImageDataUrl
        );
      }
    });

    // Cleanup old URLs (only for object URLs, not data URLs)
    thumbnailUrls.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });

    setThumbnailUrls(newThumbnailUrls);
  }, [documents]);

  const handleDownload = async (doc: ExportedDocument) => {
    if (!doc._id) return;

    setDownloading(doc._id.toString());
    try {
      const response = await fetch(`/api/documents/${doc._id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download started",
          description: `Downloading ${doc.filename}`,
        });
      } else {
        throw new Error("Failed to download document");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the document",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (doc: ExportedDocument) => {
    if (!doc._id) return;

    setDeleting(doc._id.toString());
    try {
      const response = await fetch(`/api/documents/${doc._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments(
          documents.filter((d) => d._id?.toString() !== doc._id?.toString())
        );
        toast({
          title: "Document deleted",
          description: `${doc.filename} has been deleted`,
        });
      } else {
        throw new Error("Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the document",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document history...</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground">
            Export your first document to see it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Document History</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => {
          // Get thumbnail URL from state
          const thumbnailUrl = doc._id
            ? thumbnailUrls.get(doc._id.toString())
            : null;

          return (
            <Card
              key={doc._id?.toString()}
              className="hover:shadow-lg transition-all duration-200 hover:scale-105 group overflow-hidden pt-0"
            >
              {/* Thumbnail */}
              <div className="relative">
                <AspectRatio ratio={3 / 4}>
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={doc.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Image failed to load:", {
                          src: thumbnailUrl.substring(0, 100),
                          title: doc.title,
                        });
                        // Hide the image and show fallback
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget
                          .nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center ${
                      thumbnailUrl ? "hidden" : ""
                    }`}
                  >
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-blue-600 font-medium">
                        {doc.title}
                      </p>
                      {!thumbnailUrl && (
                        <p className="text-xs text-blue-500 mt-1">
                          No thumbnail
                        </p>
                      )}
                    </div>
                  </div>
                </AspectRatio>

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc._id?.toString()}
                    className="bg-white/90 hover:bg-white text-gray-900"
                  >
                    {downloading === doc._id?.toString() ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(doc)}
                    disabled={deleting === doc._id?.toString()}
                    className="bg-red-500/90 hover:bg-red-600"
                  >
                    {deleting === doc._id?.toString() ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-2 right-2 bg-white/90 text-gray-900"
                >
                  {doc.filename.split(".").pop()?.toUpperCase()}
                </Badge>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <CardTitle className="text-base mb-2 line-clamp-2">
                  {doc.title}
                </CardTitle>

                <div className="space-y-2 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{doc.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>{doc.language}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{doc.storiesCount} stories</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(doc.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

HistoryTab.displayName = "HistoryTab";
