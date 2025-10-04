import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, isAdmin, clearAuth } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Nathan's Good Eats
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/" color="primary">Catalog</Button>
          {user ? (
            <>
              <Button component={Link} to="/cart" color="primary">Cart</Button>
              <Button component={Link} to="/orders" color="primary">My Orders</Button>
              {isAdmin && (
                <Button component={Link} to="/admin/orders" variant="outlined" color="secondary">Admin</Button>
              )}
              <Button onClick={handleLogout} variant="outlined" color="inherit">Logout</Button>
            </>
          ) : (
            <Button component={Link} to="/login" variant="contained">Login</Button>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
