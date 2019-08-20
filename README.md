# compare-packages
NodeJS + MongoDB API for comparing up to dateness of package dependencies of Github repos. Email addresses can be collected to send outdated package reports daily. Also a React UI that developed for the API is available below
https://github.com/mrsalieri/compare-packages-ui

## Installation
Just run `npm install` and do the configuration for your system. To do it, check 4 files under the config folder. To do the configuration in env, just create a .env file in the root folder and add environmental settings inside. For more information about the config and .env structure, please check the links below
https://github.com/lorenwest/node-config
https://github.com/motdotla/dotenv

## Running
You can start the API by running `npm start`, test it by `npm test`

## Future Improvements
Tests are not running smoothly, there is a problem related to jest and mongoose possibly

Cannot retrieve data from composer registry, it should be figured out

More complex comparison should be added for detecting outdated packages

Express should be isolated from controllers

Email address storage structure may be improved
