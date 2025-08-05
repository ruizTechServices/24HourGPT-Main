import { SquareClient } from "square";


const client = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN });

export default client;