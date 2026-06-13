import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, Calendar, Clock } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    admin: "Administrateur",
    manager: "Gestionnaire",
    user: "Utilisateur",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user.fullName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user.fullName}</CardTitle>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-28">Nom d'utilisateur</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-28">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-28">Rôle</span>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {roleLabels[user.role] || user.role}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-28">Membre depuis</span>
            <span className="font-medium">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "-"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
