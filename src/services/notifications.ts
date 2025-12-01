import { http } from "../lib/http";


export async function sendNotification() {
  const res = await http.post('/notifications')
}