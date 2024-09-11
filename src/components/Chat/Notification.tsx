import { Paper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { useCallback } from "react";
import OptimizedAvatar from "./OptimizedAvatar";
import { DESIGN_SYSTEM_COLORS } from " @components/lib/theme/colors";
import { INotification } from " @components/types/IChat";

dayjs.extend(relativeTime);
type CommentsProps = {
  user: any;
  notifications: any;
  openMessage: (messageId: string) => void;
};
export const Notification = ({
  user,
  notifications,
  openMessage,
}: CommentsProps) => {
  const db = getFirestore();

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const notificationRef = doc(db, "notifications", notificationId);
      updateDoc(notificationRef, {
        seen: true,
      });
    },
    [user]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px", p: 2 }}>
      {!notifications.length && (
        <></>
        // <Box
        //   sx={{
        //     display: "flex",
        //     flexDirection: "column",
        //     alignItems: "center",
        //     justifyContent: "center",
        //     marginTop: "40%",
        //   }}
        // >
        //   <NotFoundNotification
        //     title="No Comments For Read"
        //     description=""
        //   />
        // </Box>
      )}
      {notifications.map((notification: INotification, idx: number) => (
        <Paper
          className="direct-channel"
          onClick={() => markAsRead(notification.id)}
          key={idx}
          elevation={3}
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px 10px 16px",
            borderRadius: "8px",
            boxShadow: (theme) =>
              theme.palette.mode === "light"
                ? "0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)"
                : "none",
            background: (theme) =>
              theme.palette.mode === "dark"
                ? theme.palette.common.notebookG700
                : theme.palette.common.gray100,
            marginBottom: "5px",
            cursor: "pointer",
            ":hover": {
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.common.notebookG600
                  : theme.palette.common.gray200,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              width: "100%",
            }}
          >
            <Box
              sx={{
                width: `40px`,
                height: `40px`,
                cursor: "pointer",
                borderRadius: "50%",
              }}
            >
              <OptimizedAvatar
                alt={notification.senderDetail?.fullname}
                imageUrl={notification.senderDetail?.imageUrl}
                size={40}
                sx={{ border: "none" }}
              />
            </Box>
            <Box sx={{ width: "100%" }}>
              <Typography
                sx={{
                  fontSize: "14px",
                  fontWeight: "600",
                  lineHeight: "24px",
                }}
              >
                {notification?.title}
              </Typography>

              <Typography
                sx={{
                  fontSize: "13px",
                  lineHeight: "24px",
                }}
              >
                {notification?.body}
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "13px",
                    lineHeight: "24px",
                    cursor: "pointer",
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? DESIGN_SYSTEM_COLORS.gray400
                        : DESIGN_SYSTEM_COLORS.orange500,
                  }}
                >
                  {dayjs(notification.createdAt?.toDate())
                    .fromNow()
                    .includes("NaN")
                    ? "a few minutes ago"
                    : `${dayjs(notification.createdAt?.toDate()).fromNow()}`}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: DESIGN_SYSTEM_COLORS.orange400,
                  }}
                >
                  For {notification.type} tab
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};