class HttpError extends Error {
    public readonly code: number;
    public readonly errors?: Array<{ path: string; message: string }>;

    constructor(message: string, errorCode: number, errors?: Array<{ path: string; message: string }>) {
        super(message);
        this.code = errorCode;
        this.errors = errors;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export default HttpError;