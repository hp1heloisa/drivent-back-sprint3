import { getHotelById, getHotels } from "@/controllers/hotels-controller";
import { authenticateToken } from "@/middlewares";
import { validateUserInfo } from "@/middlewares/validation-user-middleware";
import { Router } from "express";

const hotelsRouter = Router();

hotelsRouter
    .all('/*', authenticateToken, validateUserInfo)
    .get('/', getHotels)
    .get('/:hotelId', getHotelById);

export { hotelsRouter };