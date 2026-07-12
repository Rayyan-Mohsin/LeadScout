import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 180000,
});

export async function searchLeads(location) {
  const { data } = await client.get("/leads", {
    params: { location },
  });
  return data;
}

export default client;
