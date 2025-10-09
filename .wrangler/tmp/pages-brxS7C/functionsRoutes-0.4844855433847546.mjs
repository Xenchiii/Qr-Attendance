import { onRequest as __api___path___js_onRequest } from "/Users/prince/Documents/Attendance qr/qr-attendance-backend/functions/api/[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]