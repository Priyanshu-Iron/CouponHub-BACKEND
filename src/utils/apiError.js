class ApiError extends Error {
    constructor(
        statusCode = 500,
        message = "Something went wrong",
        errors = [],
        data = null,
        stack = ""
    ) {
        super(message); // Sets the message property on the Error instance
        this.statusCode = statusCode;
        this.data = data;
        this.success = false;
        this.errors = errors;

        // Capture stack trace if no custom stack is provided
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };
