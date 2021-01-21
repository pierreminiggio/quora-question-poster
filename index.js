import puppeteer from 'puppeteer'

/**
 * @typedef {Object} QuoraQuestionPosterConfig
 * @property {boolean} show default false
 * 
 * @param {string} login
 * @param {string} password
 * @param {string} content
 * @param {QuoraQuestionnfig} config 
 * 
 * @returns {Promise<string>}
 */
export default function (login, password, content, config = {}) {

    return new Promise(async (resolve, reject) => {
        
        setDefaultConfig(config, 'show', false)

        let browser
        try {
            browser = await puppeteer.launch({
                headless: ! config.show,
                args: [
                    '--disable-notifications',
                    '--no-sandbox'
                ]
            })
        } catch (e) {
            reject(e)
            return
        }
        
        try {
            const page = await browser.newPage()
            //https://fr.quora.com/

            resolve('quora question id')
        } catch (e) {
            await browser.close()
            reject(e)
        }
    })
}

/**
 * @param {QuoraQuestionnfig} config 
 * @param {string} configKey 
 * @param {*} defaultValue
 * 
 * @returns {void}
 */
function setDefaultConfig(config, configKey, defaultValue) {
    if (! (configKey in config)) {
        config[configKey] = defaultValue
    }
}
