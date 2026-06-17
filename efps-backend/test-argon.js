const argon2 = require("argon2");
const hash = "$argon2id$v=19$m=65536,t=3,p=4$8ZXBOntSd6RS/vkAykrmjw$lWRf+3gvSuWMUPQGHMpIKajvBt79QY8Y8y7SNxdx6ys";
argon2.verify(hash, "Dealer@123").then(console.log).catch(console.error);
