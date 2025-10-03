import { useEffect, useState } from "react";
import api from "../api/client";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setErr("");
    try {
      const url = statusFilter ? `/orders/?status=${statusFilter}` : "/orders/";
      const { data } = await api.get(url);
      setOrders(data.items);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load orders");
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function updateStatus(orderId, status) {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Update failed");
    }
  }

  if (err) return <Container sx={{ my: 4 }}><Alert severity="error">{err}</Alert></Container>;
  if (!orders) return <Container sx={{ my: 4 }}><Typography>Loading…</Typography></Container>;

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Admin: Orders</Typography>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="placed">placed</MenuItem>
          <MenuItem value="complete">complete</MenuItem>
          <MenuItem value="canceled">canceled</MenuItem>
        </TextField>
      </Stack>

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
              </Stack>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                onClick={() => updateStatus(o.id, "complete")}
                disabled={o.status === "complete"}
              >
                Mark Complete
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => updateStatus(o.id, "canceled")}
                disabled={o.status === "canceled"}
              >
                Cancel
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
