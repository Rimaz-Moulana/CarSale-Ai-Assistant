import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'carsales-realm',
  clientId: 'cars-sale'
});

export default keycloak;
