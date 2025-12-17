"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search, Image as ImageIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ClientDocument {
  id: string;
  type: "meal-picture" | "medical-report" | "transformation";
  uploadedAt: string;
  fileName: string;
  filePath: string;
}

interface DocumentsSectionProps {
  client: {
    _id: string;
    createdAt: string;
    documents?: ClientDocument[];
  };
  formatDate: (date: string) => string;
}

export default function DocumentsSection({
  client,
  formatDate,
}: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>(
    client.documents || []
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState<
    "meal-picture" | "medical-report" | "transformation" | ""
  >("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [filterType, setFilterType] = useState<"all" | "meal-picture" | "medical-report" | "transformation">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and search documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesType = filterType === "all" || doc.type === filterType;
    const matchesSearch = searchQuery === "" || 
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const isImage = f.type.startsWith("image/");
    const isPdf = f.type === "application/pdf";

    if (!isImage && !isPdf) {
      alert("Only image or PDF files are allowed");
      return;
    }

    setFile(f);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!docType || !file) {
      alert("Please select document type and file");
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("type", docType);
      formData.append("file", file);

      const res = await fetch(`/api/users/${client._id}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setDocuments(data.documents);
      setUploadOpen(false);
      setDocType("");
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Error uploading document");
    } finally {
      setIsUploading(false);
    }
  };

  const shortenFileName = (name: string, maxLength = 25) => {
    if (name.length <= maxLength) return name;
    const ext = name.split(".").pop();
    return name.substring(0, maxLength) + (ext ? `.${ext}` : "...");
  };

  const viewFile = (filePath: string) => {
    window.open(filePath, "_blank");
  };

  const downloadFile = (filePath: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = filePath;
    link.download = fileName;
    link.click();
  };

  const hasDocuments = filteredDocuments.length > 0;

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Client Documents</CardTitle>

            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[180px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Filter Dropdown */}
              <Select
                value={filterType}
                onValueChange={(val: any) => setFilterType(val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="meal-picture">Meal Pictures</SelectItem>
                  <SelectItem value="medical-report">Medical Reports</SelectItem>
                  <SelectItem value="transformation">Transformation</SelectItem>
                </SelectContent>
              </Select>

              {/* Upload Button */}
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Document type</Label>
                      <Select
                        value={docType}
                        onValueChange={(value) => setDocType(value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meal-picture">
                            Meal pictures
                          </SelectItem>
                          <SelectItem value="medical-report">
                            Medical report
                          </SelectItem>
                          <SelectItem value="transformation">
                            Transformation
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {docType === "transformation" && (
                        <p className="text-xs text-gray-500">
                          Transformation photos: Before/After images showing client progress
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>File (image or PDF)</Label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                      />
                      {file && (
                        <p className="text-xs text-gray-500">
                          Selected: {file.name}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setUploadOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isUploading}>
                        {isUploading ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!hasDocuments && (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-400" />
              <p className="text-sm mb-1">No documents found.</p>
              <p className="text-xs text-gray-400">
                Try changing the filter or uploading a document.
              </p>
            </div>
          )}

          {hasDocuments && (
            <div className="mt-4 overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-3 py-2">S.No</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">File name</th>
                    <th className="px-3 py-2">Uploaded on</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDocuments.map((doc, index) => (
                    <tr
                      key={index}
                      className={cn(
                        "border-t",
                        index % 2 ? "bg-gray-50" : "bg-white"
                      )}
                    >
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2 capitalize">
                        {doc.type === "meal-picture"
                          ? "Meal pictures"
                          : doc.type === "transformation"
                          ? "Transformation"
                          : "Medical report"}
                      </td>
                      <td className="px-3 py-2">
                        {shortenFileName(doc.fileName)}
                      </td>
                      <td className="px-3 py-2">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="px-3 py-2 text-right flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewFile(doc.filePath)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            downloadFile(doc.filePath, doc.fileName)
                          }
                        >
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
