export default function notFound(request, response) {
  response.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: request.path.startsWith("/api") ? "API route not found." : "Route not found."
    }
  });
}
