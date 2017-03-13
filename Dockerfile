FROM node:boron
RUN mkdir /src
WORKDIR /src
COPY package.json /src
RUN npm install
COPY . /src
EXPOSE 3000
CMD ["npm", "start"]
