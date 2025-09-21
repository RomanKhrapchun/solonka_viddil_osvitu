//Example of communityConstants.js file
const territory_title = "Тестова міська рада"
const territory_title_instrumental = "Тестової міської територіальної громади"
const website_name = "Портал місцевих податків Тестової громади"
const website_url = "https://testova.skydatagroup.com/"
const telegram_name = "Місцеві податки Тестової ТГ"
const telegram_url = "https://t.me/Testova_taxes_bot"
const phone_number_GU_DPS = "(03229) 7-30-91"
const CURRENT_REGION = {
    name: "Львівська область",
    genitive: "Львівської області",    // ГУ ДПС у Чернігівської області
    dative: "Львівській області",      // у Чернігівській області
    accusative: "Львівської область",   // до Чернігівську область
    instrumental: "Львівською областю", // з Чернігівською областю
    locative: "Львівській області"     // у Чернігівській області
};
const GU_DPS_region = CURRENT_REGION.genitive
const debt_charge_account = "UA1111111111111111111111111111"; 
const GU_DPS_ADDRESS = "79003, м. Львів, вул. Стрийська, 35"; 
const publicKeyXPay = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9+1AEFfD9MoO0IWeMk3f    
aFoYBBekFgHmUGM48AVh6BW/s5r16mtUfMfRfezVgqluwV/liEd6hArmmEZIKwYE    
mJoAYuY/ny9QJpc8zY+toR5IJEtYxfStHmVwKSuvHL3KY/U/Ok5UUT2u075JPZb+
FtDZwW9KXkwmT53HQ6iS0XFyy621vGrs6XcdGwO6eZPptkvc8SYKDwClgLjI69Iz
b6K/dfdQUioMPvZOXpdzrEQXjnipmsYh1VxOufqsX1SDzqR67Zs114OnHWAZhTXE
ksUjKavJkCc07T+nu1O/r99rsrRCaQODVq8SMAoK1vxJLf29WFv4ydp4vIk+n98/
DQIDAQAB
-----END PUBLIC KEY-----`;
const privateKey = ``;


module.exports = {
    territory_title,
    territory_title_instrumental,
    website_name,
    website_url,
    telegram_name,
    telegram_url,
    phone_number_GU_DPS,
    GU_DPS_region,
    debt_charge_account,
    GU_DPS_ADDRESS,
    publicKeyXPay,
    privateKey
};