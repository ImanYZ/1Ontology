/* # AppHeader.tsx

## Overview
This file contains the implementation of the application header component (`AppHeader`) in TypeScript, which serves as the top navigation bar for the project. It includes features such as theming, user authentication, and a profile menu.

## Dependencies
- `@mui/icons-material`: Material-UI icons for DarkMode, LightMode, and Logout.
- `@mui/material`: Material-UI components for UI elements.
- `@mui/system`: Material-UI system for styling.
- `firebase/auth`: Firebase authentication module.
- `next/image`: Next.js Image component for optimized image loading.
- `next/router`: Next.js router for navigation.
- `react`: React library for building user interfaces.

## Constants
- `HEADER_HEIGHT`: Constant defining the height of the header.
- `HEADER_HEIGHT_MOBILE`: Constant defining the height of the header on mobile devices.
- `orangeDark` and `orange900`: Constants defining color values.

## Types
- `HeaderPage`: Type representing possible pages for the header.
- `AppHeaderProps`: Props interface for the `AppHeader` component.

## Components
### AppHeader Component
- The `AppHeader` component is a functional component that serves as the application header.
- It includes theming functionality, user authentication, and a profile menu.
- The header is styled using Material-UI components and includes a dynamic logo based on the theme.

### Usage
```tsx
import AppHeader from 'path/to/AppHeader';
*/

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import { Avatar, Button, Typography, useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { Stack } from "@mui/system";
import { getAuth } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { forwardRef, useCallback, useState } from "react";
import mitLogo from "../../../public/CCI-logo.gif";
import mitLogoDark from "../../../public/MIT-Logo-Dark.png";
import { capitalizeString } from "../../lib/utils/string.utils";
import useThemeChange from " @components/lib/hooks/useThemeChange";
import { DESIGN_SYSTEM_COLORS } from " @components/lib/theme/colors";
import ROUTES from " @components/lib/utils/routes";
import { useAuth } from "../context/AuthContext";
import { collection, doc, getFirestore, updateDoc } from "firebase/firestore";

export const HEADER_HEIGHT = 80;
export const HEADER_HEIGHT_MOBILE = 72;

export const orangeDark = "#FF6D00";
export const orange900 = "#E56200";

export type HeaderPage = "ONE_CADEMY" | "ONE_ASSISTANT" | "COMMUNITIES";

type AppHeaderProps = {
  setRightPanelVisible: any;
  rightPanelVisible: boolean;
  loading: boolean;
};
const AppHeader = forwardRef(
  (
    { setRightPanelVisible, rightPanelVisible, loading }: AppHeaderProps,
    ref
  ) => {
    const [{ isAuthenticated, user }] = useAuth();
    const [handleThemeSwitch] = useThemeChange();
    const theme = useTheme();
    const router = useRouter();
    const [profileMenuOpen, setProfileMenuOpen] = useState(null);
    const isProfileMenuOpen = Boolean(profileMenuOpen);
    const db = getFirestore();
    const signOut = async () => {
      router.push(ROUTES.signIn);
      getAuth().signOut();
    };

    const handleProfileMenuOpen = (event: any) => {
      setProfileMenuOpen(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
      setProfileMenuOpen(null);
    };

    const renderProfileMenu = (
      <Menu
        id="ProfileMenu"
        anchorEl={profileMenuOpen}
        open={isProfileMenuOpen}
        onClose={handleProfileMenuClose}
      >
        {isAuthenticated && user && (
          <Typography sx={{ p: "6px 16px" }}>
            {capitalizeString(user.fName ?? "")}
          </Typography>
        )}
        {isAuthenticated && user && (
          <MenuItem sx={{ flexGrow: 3 }} onClick={signOut}>
            <LogoutIcon /> <span id="LogoutText">Logout</span>
          </MenuItem>
        )}
      </Menu>
    );
    const toggleRightPanel = useCallback(() => {
      if (!user?.uname) return;
      const userRef = doc(collection(db, "users"), user.uname);
      updateDoc(userRef, {
        rightPanel: !rightPanelVisible,
      });
      setRightPanelVisible((prev: boolean) => {
        return !prev;
      });
    }, [rightPanelVisible]);

    return (
      <>
        <Box
          ref={ref}
          sx={{
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(0,0,0,.72)"
                : DESIGN_SYSTEM_COLORS.gray200,
            backdropFilter: "saturate(180%) blur(10px)",
            position: "sticky",
            top: "0",
            // zIndex: "22",
          }}
        >
          <Stack
            direction={"row"}
            justifyContent="space-between"
            alignItems="center"
            spacing={{ xs: "2px", sm: "8px", md: "16px" }}
            sx={{
              px: { xs: "16px", sm: "32px" },
              maxWidth: "100%",
              margin: "auto",
              height: {
                xs: `${HEADER_HEIGHT_MOBILE}px`,
                md: `${HEADER_HEIGHT}px`,
              },
            }}
          >
            <Stack direction={"row"} alignItems="center" spacing={"16px"}>
              <Avatar
                src={
                  theme.palette.mode === "dark" ? mitLogoDark.src : mitLogo.src
                }
                alt="logo"
                sx={{
                  cursor: "pointer",
                  width: "240px",
                  height: "auto",
                  borderRadius: 0,
                }}
                onClick={() => {}}
              />
            </Stack>
            {!loading && (
              <Stack
                direction={"row"}
                justifyContent="flex-end"
                alignItems="center"
                spacing={"8px"}
              >
                <Button
                  onClick={toggleRightPanel}
                  variant={rightPanelVisible ? "contained" : "outlined"}
                >
                  {rightPanelVisible ? "Hide Left Panel" : "Show Left Panel"}
                </Button>
                <Tooltip title="Change theme">
                  <IconButton onClick={handleThemeSwitch} size="small">
                    {theme.palette.mode === "dark" ? (
                      <LightModeIcon />
                    ) : (
                      <DarkModeIcon />
                    )}
                  </IconButton>
                </Tooltip>

                {isAuthenticated && user && (
                  <Tooltip title={capitalizeString(user.fName ?? "")}>
                    <IconButton onClick={handleProfileMenuOpen}>
                      <Box
                        sx={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "30px",
                          color: (theme) => theme.palette.common.gray,
                        }}
                        aria-haspopup="true"
                        aria-controls="lock-menu"
                        aria-label={`${user.fName}'s Account`}
                        aria-expanded={isProfileMenuOpen ? "true" : undefined}
                      >
                        <Image
                          src={user.imageUrl || ""}
                          alt={user.fName}
                          width={26}
                          height={26}
                          quality={40}
                          objectFit="cover"
                          style={{
                            borderRadius: "30px",
                          }}
                        />
                      </Box>
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Stack>
          {isAuthenticated && user && renderProfileMenu}
        </Box>
      </>
    );
  }
);

AppHeader.displayName = "AppHeader";

const AppHeaderMemoized = React.memo(AppHeader);

export default AppHeaderMemoized;
