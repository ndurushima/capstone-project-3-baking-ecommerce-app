import { useEffect, useState } from "react";
import api from "../api/client";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import { Link } from "react-router-dom";

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/orders/")
      .then((res) => setOrders(res.data.items))
      .catch((e) => setErr(e?.response?.data?.error || "Failed to load orders"));
  }, []);

  if (err) {
    return <Container sx={{ my: 4 }}><Typography color="error">{err}</Typography></Container>;
  }
  if (!orders) return <Container sx={{ my: 4 }}><Typography>Loading…</Typography></Container>;

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>My Orders</Typography>

      {orders.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography>No orders yet.</Typography>
          <Button sx={{ mt: 2 }} variant="contained" component={Link} to="/">Browse Desserts</Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {orders.map((o) => (
            <Paper key={o.id} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">Order #{o.id}</Typography>
                  <Typography variant="body2">
                    {o.fulfillment_date}{o.requested_time ? ` • ${o.requested_time}` : ""} • {o.fulfillment_method}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label={o.status} />
                  <Typography variant="h6">${Number(o.total).toFixed(2)}</Typography>
                  <Button size="small" component={Link} to={`/order-confirmation/${o.id}`}>
                    View
                  </Button>
                </Stack>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={0.5}>
                {o.items.slice(0, 3).map((it) => (
                  <Typography key={it.id} variant="body2">
                    {it.product?.name} × {it.qty}
                  </Typography>
                ))}
                {o.items.length > 3 && (
                  <Typography variant="caption">+ {o.items.length - 3} more</Typography>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}
