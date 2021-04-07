require('dotenv').config();

const db = require('./db');
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
db.connect(DB_HOST, DB_USER, DB_PASS);

const models = require('./models');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const express = require('express');
const { ApolloServer, AuthenticationError } = require('apollo-server-express');
const jwt = require('jsonwebtoken');

const getUser = token => {
  if (token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new Error('Session invalid');
    }
  }
};

const app = express();

const helmet = require('helmet');
const cors = require('cors');
// web安全最佳实践
app.use(helmet());
// 跨域
app.use(cors());

const depthLimit = require('graphql-depth-limit');
const { createComplexityLimitRule } = require('graphql-validation-complexity');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5), createComplexityLimitRule(1000)],
  context: ({ req }) => {
    const operationName = req.body.operationName;
    console.log('operationName:', operationName);
    if (!['signIn', 'signUp'].includes(operationName)) {
      // 限制登录用户才能进行访问
      const token = req.headers.authorization;
      const user = getUser(token);
      console.log(user);
      if (!user) {
        throw new AuthenticationError();
      }
      return { models, user };
    }
    return { models };
  }
});
server.applyMiddleware({ app, path: '/api' });

const port = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(port, () => {
  console.log(
    `GraphQL Server running at http://localhost:${port}${server.graphqlPath}`
  );
});
