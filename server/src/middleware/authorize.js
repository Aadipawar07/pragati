export default function authorize(...roles) {
  return (request, _response, next) => {
    if (!roles.length || roles.includes(request.user?.role)) return next();
    const error = new Error("You do not have permission to access this resource.");
    error.status = 403;
    error.code = "FORBIDDEN";
    next(error);
  };
}
