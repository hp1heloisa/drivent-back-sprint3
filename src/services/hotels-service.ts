import { notFoundError } from "@/errors";
import { hotelsRepository } from "@/repositories/hotels-repository";

async function getHotels(){
    const allHotels = await hotelsRepository.getHotels();
    if (allHotels.length == 0) throw notFoundError();
    return allHotels;
}

async function getHotelById(id: number){
    const hotelInfo = await hotelsRepository.getHotelById(id);
    if (hotelInfo == null) throw notFoundError();
    return hotelInfo;
}

export const hotelsService = {
    getHotels,
    getHotelById
}