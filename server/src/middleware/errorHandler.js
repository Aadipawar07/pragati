export default function errorHandler(error, _request, response, _next) {
  const isDuplicateKey = error.code === 11000;
  const status = error.status || (isDuplicateKey ? 409 : 500);
  const isProduction = process.env.NODE_ENV === "production";
  const message = isDuplicateKey
    ? "A record with these details already exists."
    : status >= 500 && isProduction && !error.expose
      ? "Something went wrong."
      : error.message || "Something went wrong.";
  response.status(status).json({
    success: false,
    error: {
      code: isDuplicateKey ? "DUPLICATE_RECORD" : error.code || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR"),
      message
    }
  });
}
