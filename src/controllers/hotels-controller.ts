import { Request, Response } from "express";
import { hotelsService } from "@/services/hotels-service";
import httpStatus from "http-status";

export async function getHotels(req: Request, res: Response){
    const allHotels = await hotelsService.getHotels();
    res.status(httpStatus.OK).send(allHotels);
}

export async function getHotelById(req: Request, res: Response){
    const hotelId = Number(req.params.hotelId);
    const hotelInfo = await hotelsService.getHotelById(hotelId);
    res.status(httpStatus.OK).send(hotelInfo);
}
