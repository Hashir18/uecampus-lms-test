import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, Download, Trash2, Edit, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useEditMode } from "@/contexts/EditModeContext";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface Software {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  download_url: string | null;
  version: string | null;
  category: string | null;
  created_at: string;
}

export default function Softwares() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAdmin } = useEditMode();
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    download_url: "",
    version: "",
    category: ""
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);

  useEffect(() => {
    loadSoftwares();
  }, []);

  const loadSoftwares = async () => {
    try {
      const data = await apiFetch<Software[]>("/softwares");
      setSoftwares(data);
    } catch (error) {
      toast.error("Failed to load softwares");
    }
  };

  const handleAddSoftware = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    setUploading(true);
    try {
      const payload = new FormData();
      payload.append("title", formData.title);
      if (formData.description) payload.append("description", formData.description);
      if (formData.download_url) payload.append("download_url", formData.download_url);
      if (formData.version) payload.append("version", formData.version);
      if (formData.category) payload.append("category", formData.category);
      if (coverImage) payload.append("cover", coverImage);

      await apiFetch("/softwares", { method: "POST", body: payload });

      toast.success("Software added successfully");
      setAddDialogOpen(false);
      resetForm();
      loadSoftwares();
    } catch (error: any) {
      toast.error(error.message || "Failed to add software");
    } finally {
      setUploading(false);
    }
  };

  const handleEditSoftware = async () => {
    if (!selectedSoftware || !formData.title) {
      toast.error("Title is required");
      return;
    }

    try {
      await apiFetch(`/softwares/${selectedSoftware.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          download_url: formData.download_url,
          version: formData.version,
          category: formData.category,
          // cover updates are not handled in update endpoint
        }),
      });

      toast.success("Software updated successfully");
      setEditDialogOpen(false);
      resetForm();
      loadSoftwares();
    } catch (error: any) {
      toast.error(error.message || "Failed to update software");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this software?")) return;

    try {
      await apiFetch(`/softwares/${id}`, { method: "DELETE" });
      toast.success("Software deleted successfully");
      loadSoftwares();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete software");
    }
  };

  const openEditDialog = (software: Software) => {
    setSelectedSoftware(software);
    setFormData({
      title: software.title,
      description: software.description || "",
      download_url: software.download_url || "",
      version: software.version || "",
      category: software.category || ""
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      download_url: "",
      version: "",
      category: ""
    });
    setCoverImage(null);
    setSelectedSoftware(null);
  };

  const filteredSoftwares = softwares.filter(software =>
    software.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    software.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Software Library</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Manage software resources" : "Browse available software"}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Software
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Software</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Adobe Photoshop"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the software"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="e.g., 2024.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Development">Development</SelectItem>
                        <SelectItem value="Productivity">Productivity</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Download URL</Label>
                  <Input
                    value={formData.download_url}
                    onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                    placeholder="https://example.com/download"
                  />
                </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              />
            </div>
                <Button onClick={handleAddSoftware} className="w-full" disabled={uploading}>
                  {uploading ? "Adding..." : "Add Software"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search software..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSoftwares.map(software => (
          <Card key={software.id} className="overflow-hidden hover:shadow-xl transition-all">
            {software.cover_image_url && (
              <div className="h-48 overflow-hidden bg-muted">
                <img
                  src={software.cover_image_url}
                  alt={software.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{software.title}</h3>
                  {software.category && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {software.category}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(software)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(software.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {software.version && (
                <p className="text-sm text-muted-foreground mb-2">Version {software.version}</p>
              )}
              {software.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {software.description}
                </p>
              )}
              {software.download_url && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open(software.download_url!, "_blank")}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </Card>
        ))}
        {filteredSoftwares.length === 0 && (
          <Card className="p-12 text-center col-span-full">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No software found</h3>
            <p className="text-muted-foreground">
              {isAdmin ? "Add your first software to get started" : "No software available yet"}
            </p>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Software</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Adobe Photoshop"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the software"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., 2024.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Productivity">Productivity</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Download URL</Label>
              <Input
                value={formData.download_url}
                onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                placeholder="https://example.com/download"
              />
            </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              />
              {selectedSoftware?.cover_image_url && !coverImage && (
                <p className="text-sm text-muted-foreground">Current image will be kept if no new image is uploaded</p>
              )}
            </div>
            <Button onClick={handleEditSoftware} className="w-full" disabled={uploading}>
              {uploading ? "Updating..." : "Update Software"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
