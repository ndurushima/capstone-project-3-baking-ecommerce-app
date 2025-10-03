import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";

const FALLBACK_IMG = "/placeholder-dessert.jpg";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((e) => setErr(e?.response?.data?.error || "Could not load order"));
  }, [id]);

  if (err) {
    return (
      <Container maxWidth="sm" sx={{ my: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography color="error">{err}</Typography>
          <Button sx={{ mt: 2 }} component={Link} to="/">Back to Home</Button>
        </Paper>
      </Container>
    );
  }

  if (!order) return <Container sx={{ my: 4 }}><Typography>Loading…</Typography></Container>;

  return (
    <Container maxWidth="sm" sx={{ my: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>Thank you! 🎉</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Order <strong>#{order.id}</strong> is <strong>{order.status}</strong>.
        </Typography>

        <Stack spacing={2} divider={<Divider flexItem />}>
          <Stack direction="row" justifyContent="space-between">
            <Typography>Fulfillment date</Typography>
            <Typography>{order.fulfillment_date}</Typography>
          </Stack>
          {order.requested_time && (
            <Stack direction="row" justifyContent="space-between">
              <Typography>Requested time</Typography>
              <Typography>{order.requested_time}</Typography>
            </Stack>
          )}
          <Stack direction="row" justifyContent="space-between">
            <Typography>Method</Typography>
            <Typography>{order.fulfillment_method}</Typography>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="subtitle1">Items</Typography>
            {order.items.map((it) => (
              <Stack key={it.id} direction="row" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <img
                    src={it.product?.image_url || FALLBACK_IMG}
                    alt={it.product?.name || "Dessert"}
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                    style={{ width: 56, height: 44, objectFit: "cover", borderRadius: 6 }}
                  />
                  <Typography>{it.product?.name} × {it.qty}</Typography>
                </Stack>
                <Typography>${Number(it.line_total).toFixed(2)}</Typography>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography variant="subtitle1">Total</Typography>
              <Typography variant="h6">${Number(order.total).toFixed(2)}</Typography>
            </Stack>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button variant="contained" component={Link} to="/orders">View My Orders</Button>
          <Button variant="outlined" component={Link} to="/">Back to Catalog</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
