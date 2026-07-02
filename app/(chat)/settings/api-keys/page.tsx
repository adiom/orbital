"use client";

import { AlertCircle, Copy, Key, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: {
    resources: boolean;
    tools: boolean;
    admin: boolean;
  };
  lastUsedAt: string | null;
  usageCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [newKeyPermissions, setNewKeyPermissions] = useState({
    resources: true,
    tools: false,
    admin: false,
  });
  const [createdKey, setCreatedKey] = useState<string>("");

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/keys");
      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }
      const data = await response.json();
      setApiKeys(data.keys);
    } catch (error) {
      toast.error("Failed to load API keys");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName) {
      toast.error("Please enter a name for the API key");
      return;
    }

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
          expiresIn: newKeyExpiry === "never" ? null : newKeyExpiry,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create API key");
      }

      const data = await response.json();
      setCreatedKey(data.plainKey);
      setShowCreateDialog(false);
      setShowKeyDialog(true);

      // Reset form
      setNewKeyName("");
      setNewKeyExpiry("never");
      setNewKeyPermissions({
        resources: true,
        tools: false,
        admin: false,
      });

      // Refresh list
      await fetchApiKeys();

      toast.success("API key created successfully");
    } catch (error) {
      toast.error("Failed to create API key");
      console.error(error);
    }
  };

  const revokeApiKey = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke API key");
      }

      // Remove from list
      setApiKeys(apiKeys.filter((key) => key.id !== id));
      toast.success("API key revoked successfully");
    } catch (error) {
      toast.error("Failed to revoke API key");
      console.error(error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getPermissionsText = (permissions: ApiKey["permissions"]) => {
    const perms = [];
    if (permissions.resources) perms.push("Read");
    if (permissions.tools) perms.push("Write");
    if (permissions.admin) perms.push("Admin");
    return perms.join(", ") || "None";
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your MCP API keys for programmatic access to Sferas
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                Create and manage API keys for MCP access
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-8 text-center">
              <Key className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">
                You haven&apos;t created any API keys yet
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Create your first API key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1 py-0.5 text-sm">
                        {key.prefix}...
                      </code>
                    </TableCell>
                    <TableCell>{getPermissionsText(key.permissions)}</TableCell>
                    <TableCell>{formatDate(key.lastUsedAt)}</TableCell>
                    <TableCell>{key.usageCount} calls</TableCell>
                    <TableCell>{formatDate(key.expiresAt)}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => revokeApiKey(key.id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Configure your new API key settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production, Development"
                value={newKeyName}
              />
            </div>

            <div>
              <Label htmlFor="expiry">Expiration</Label>
              <Select onValueChange={setNewKeyExpiry} value={newKeyExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expire</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-normal" htmlFor="perm-resources">
                    Read Resources (View Sferas)
                  </Label>
                  <Switch
                    checked={newKeyPermissions.resources}
                    id="perm-resources"
                    onCheckedChange={(checked: boolean) =>
                      setNewKeyPermissions({
                        ...newKeyPermissions,
                        resources: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal" htmlFor="perm-tools">
                    Use Tools (Send messages, invoke AI)
                  </Label>
                  <Switch
                    checked={newKeyPermissions.tools}
                    id="perm-tools"
                    onCheckedChange={(checked: boolean) =>
                      setNewKeyPermissions({
                        ...newKeyPermissions,
                        tools: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal" htmlFor="perm-admin">
                    Admin Access (Manage members)
                  </Label>
                  <Switch
                    checked={newKeyPermissions.admin}
                    id="perm-admin"
                    onCheckedChange={(checked: boolean) =>
                      setNewKeyPermissions({
                        ...newKeyPermissions,
                        admin: checked,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowCreateDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={createApiKey}>Create API Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created Key Dialog */}
      <Dialog onOpenChange={setShowKeyDialog} open={showKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
               Save this API key securely. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
               Save this API key securely. You won&apos;t be able to see it again!
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  className="font-mono text-sm"
                  readOnly
                  value={createdKey}
                />
                <Button
                  onClick={() => copyToClipboard(createdKey)}
                  size="icon"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 font-medium text-sm">MCP Configuration</p>
              <p className="mb-2 text-muted-foreground text-xs">
                Add this to your Claude Desktop config:
              </p>
              <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
                {`{
  "mcpServers": {
    "avrora": {
      "url": "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/mcp",
      "apiKey": "${createdKey}"
    }
  }
}`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
