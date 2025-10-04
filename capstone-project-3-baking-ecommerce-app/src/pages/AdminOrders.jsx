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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

const FALLBACK_IMG = "/placeholder-dessert.jpg";

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function updateStatus(orderId, status) {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      await load();
      // if dialog open on this order, refresh the detail view too
      if (openId === orderId) await fetchDetail(orderId);
    } catch (e) {
      alert(e?.response?.data?.error || "Update failed");
    }
  }

  async function fetchDetail(orderId) {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setDetail(data);
    } catch (e) {
      setDetail(null);
      alert(e?.response?.data?.error || "Failed to load order details");
    } finally {
      setLoadingDetail(false);
    }
  }

  function openDetails(orderId) {
    setOpenId(orderId);
    fetchDetail(orderId);
  }

  function closeDetails() {
    setOpenId(null);
    setDetail(null);
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={o.status} />
                <Typography variant="h6">${Number(o.total).toFixed(2)}</Typography>
                <Button size="small" onClick={() => openDetails(o.id)}>View</Button>
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

      {/* Details Dialog */}
      <Dialog open={!!openId} onClose={closeDetails} fullWidth maxWidth="sm">
        <DialogTitle>Order Details {detail ? `#${detail.id}` : ""}</DialogTitle>
        <DialogContent dividers>
          {!detail || loadingDetail ? (
            <Typography>Loading…</Typography>
          ) : (
            <Stack spacing={2}>
              {/* Top meta */}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Date</Typography>
                <Typography variant="body2">{detail.fulfillment_date}</Typography>
              </Stack>
              {detail.requested_time && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Requested time</Typography>
                  <Typography variant="body2">{detail.requested_time}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Method</Typography>
                <Typography variant="body2">{detail.fulfillment_method}</Typography>
              </Stack>

              {/* Delivery block */}
              {detail.fulfillment_method === "delivery" && detail.delivery && (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Delivery Address</Typography>
                  <Typography variant="body2">{detail.delivery.name}</Typography>
                  <Typography variant="body2">{detail.delivery.line1}</Typography>
                  {detail.delivery.line2 && <Typography variant="body2">{detail.delivery.line2}</Typography>}
                  <Typography variant="body2">
                    {detail.delivery.city}, {detail.delivery.state} {detail.delivery.zip}
                  </Typography>
                </Paper>
              )}

              {/* Items */}
              <Stack spacing={1}>
                <Typography variant="subtitle2">Items</Typography>
                {detail.items.map((it) => (
                  <Stack key={it.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <img
                        src={it.product?.image_url || FALLBACK_IMG}
                        alt={it.product?.name || "Dessert"}
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                        style={{ width: 56, height: 44, objectFit: "cover", borderRadius: 6 }}
                      />
                      <Typography variant="body2">
                        {it.product?.name} × {it.qty}
                      </Typography>
                    </Stack>
                    <Typography variant="body2">
                      ${Number(it.line_total).toFixed(2)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider />

              {/* Totals */}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Total</Typography>
                <Typography variant="h6">${Number(detail.total).toFixed(2)}</Typography>
              </Stack>

              {/* User info (if provided by backend) */}
              {detail.user_email && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Customer</Typography>
                  <Typography variant="body2">{detail.user_email}</Typography>
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {detail && (
            <>
              <Button
                size="small"
                onClick={() => updateStatus(detail.id, "complete")}
                disabled={detail.status === "complete"}
              >
                Mark Complete
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => updateStatus(detail.id, "canceled")}
                disabled={detail.status === "canceled"}
              >
                Cancel
              </Button>
            </>
          )}
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
