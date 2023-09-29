import { TicketStatus } from "@prisma/client";
import app, { init } from "@/app";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import supertest from "supertest";
import { createEnrollmentWithAddress, createTicket, createTicketType, createUser } from "../factories";
import { cleanDb, generateValidToken } from "../helpers";
import * as jwt from 'jsonwebtoken';
import { createHotel, createRoom } from "../factories/hotels-factory";
import { prisma } from "@/config";


beforeAll(async () => {
    await init();
  });
  
  beforeEach(async () => {
    await cleanDb();
  });
  
  const server = supertest(app);

  describe('GET /hotels', () => {
    it('should respond with status 401 if no token is given', async () => {
        const response = await server.get('/hotels');

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if given token is not valid', async () => {
        const token = faker.lorem.word();
    
        const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if there is no session for given token', async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
        const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
      });

      describe('when token is valid', () => {
        it('should respond with status 404 when there is no enrollment for given user', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
      
            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
      
            expect(response.status).toBe(httpStatus.NOT_FOUND);
        });

        it('should respond with status 404 when user doesnt have a ticket yet', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            await createEnrollmentWithAddress(user);
      
            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
      
            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it('should respond with status 404 when there is no hotels', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: true
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        })
        
        it('should respond with status 402 when ticket status is RESERVED', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: true,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

            const hotelInfo = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
            }

            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        })

        it('should respond with status 402 when there is no hotel included', async () => { //continuar
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: false,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const hotelInfo = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
            }

            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        })

        it('should respond with status 402 when is remote', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: true,
                  includesHotel: true,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const hotelInfo = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
            }

            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        })

        it('should respond with status 200 and a list with the hotels', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: true,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const hotelInfo = await createHotel();
            const hotelInfo2 = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
                await createRoom(hotelInfo2.id, i+1);
            }

            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.OK);
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(Number),
                    name: expect.any(String),
                    image: expect.any(String),
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String)
                })
            ]))
        })
        
    }) 
  })

describe('GET /hotels/:hotelId', () => {
    it('should respond with status 401 if no token is given', async () => {
        const response = await server.get('/hotels/1');

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if given token is not valid', async () => {
        const token = faker.lorem.word();
    
        const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if there is no session for given token', async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    
        const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
    
        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
      });

      describe('when token is valid', () => {
        it('should respond with status 404 when there is no enrollment for given user', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
      
            const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
      
            expect(response.status).toBe(httpStatus.NOT_FOUND);
        });

        it('should respond with status 404 when user doesnt have a ticket yet', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            await createEnrollmentWithAddress(user);
      
            const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
      
            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it('should respond with status 404 when there is no hotels', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: true
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        })
        
        it('should respond with status 402 when ticket status is RESERVED', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: true,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

            const hotelInfo = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
            }

            const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        })

        it('should respond with status 402 when there is no hotel included', async () => { //continuar
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: false,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const hotelInfo = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
            }

            const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        })

        it('should respond with status 402 when is remote', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: true,
                  includesHotel: true,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const hotelInfo = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
            }

            const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        })

        it('should respond with status 404 when there is no hotel with the id passed', async () => {
          const user = await createUser();
          const token = await generateValidToken(user);
          const enrollment = await createEnrollmentWithAddress(user);
          const ticketType = await prisma.ticketType.create({
              data: {
                name: faker.name.findName(),
                price: faker.datatype.number(),
                isRemote: false,
                includesHotel: true
              },
            });
          await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

          const response = await server.get(`/hotels/1`).set('Authorization', `Bearer ${token}`);
          expect(response.status).toEqual(httpStatus.NOT_FOUND);
      })

        it('should respond with status 200 and a list the specif hotel rooms', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await prisma.ticketType.create({
                data: {
                  name: faker.name.findName(),
                  price: faker.datatype.number(),
                  isRemote: false,
                  includesHotel: true,
                },
              });
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const hotelInfo = await createHotel();
            for (let i = 0; i < Number(faker.random.numeric()); i++){
                await createRoom(hotelInfo.id, i+1);
            }

            const response = await server.get(`/hotels/${hotelInfo.id}`).set('Authorization', `Bearer ${token}`);
            expect(response.status).toEqual(httpStatus.OK);
            expect(response.body).toEqual({
                id: expect.any(Number),
                name: expect.any(String),
                image: expect.any(String),
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
                Rooms: expect.arrayContaining([
                    expect.objectContaining({
                        id: expect.any(Number),
                        name: expect.any(String),
                        capacity: expect.any(Number),
                        hotelId: expect.any(Number),
                        createdAt: expect.any(String),
                        updatedAt: expect.any(String),
                    })
                ])
            })
        })
        
    }) 
  })