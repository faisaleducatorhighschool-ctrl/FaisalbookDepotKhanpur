import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

export default function Notifications() {
  const { data: notifications } = useListNotifications({ query: { queryKey: getListNotificationsQueryKey() } });
  
  const queryClient = useQueryClient();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "info": return <Info className="w-5 h-5 text-blue-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error": return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <Button variant="outline" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
          <Check className="w-4 h-4 mr-2" /> Mark All Read
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {notifications?.map((n) => (
            <div 
              key={n.id} 
              className={`p-4 flex gap-4 transition-colors hover:bg-muted/50 cursor-pointer ${!n.isRead ? 'bg-primary/5' : ''}`}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
            >
              <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className={`text-sm ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.message}</p>
              </div>
            </div>
          ))}
          {!notifications?.length && (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No notifications yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
