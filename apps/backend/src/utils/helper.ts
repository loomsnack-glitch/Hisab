export const normalize = (str: string) => {
    return str
        .replace(/\s+/g, " ")   // collapse all whitespace into a single space
        .trim()                 // remove leading/trailing spaces
        .toLowerCase();         // optional: ignore case
}

export const getRandomOTP = () => {
    const randomOTP = Math.floor(100000 + Math.random() * 900000).toString();
    return process.env.NODE_ENV === 'production' ? randomOTP : '123123';
}