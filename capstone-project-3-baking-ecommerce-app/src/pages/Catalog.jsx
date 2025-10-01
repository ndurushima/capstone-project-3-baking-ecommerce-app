import { useEffect, useState } from "react";
import api from "../api/client";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

export default function Catalog() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/products/spoonacular?q=dessert&number=4")  
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, []);

  return (
    <Container sx={{ py: 3 }}>
      <Grid container spacing={2}>
        {items.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Card>
              <img
                src={p.image_url}
                alt={p.name}
                onError={(e) => { e.currentTarget.src = "/placeholder-dessert.jpg"; }}
                style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                />
              <CardContent>
                <Typography variant="subtitle1">{p.name}</Typography>
                <Typography variant="body2">${p.price?.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
