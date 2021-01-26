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
            await page.goto('https://fr.quora.com')

            // login
            const loginInputSelector = 'input.header_login_text_box[name="email"]'
            const passwordInputSelector = 'input.header_login_text_box[name="password"]'
            const buttonSelector = 'input.submit_button[value="Se connecter"]'

            await page.waitForSelector(loginInputSelector)
            await page.waitForSelector(passwordInputSelector)

            await page.evaluate((loginInputSelector, passwordInputSelector, login, password) => {
                document.querySelector(loginInputSelector).value = login
                document.querySelector(passwordInputSelector).value = password
            }, loginInputSelector, passwordInputSelector, login, password)

            await page.waitForSelector(buttonSelector)
            await page.evaluate(buttonSelector => {
                const button = document.querySelector(buttonSelector)
                button.className = 'submit_button'
                button.click()
            }, buttonSelector)

            // Ask a question
            const askQuestionButtonSelector = 'button'
            await page.waitForSelector(askQuestionButtonSelector)
            await page.click(askQuestionButtonSelector)

            const questionInputSelector = 'textarea'
            console.log('waiting')
            await page.waitForSelector(questionInputSelector)
            console.log('waited')
            await page.evaluate((questionInputSelector, content) => {
                document.querySelector(questionInputSelector).value = content
            }, questionInputSelector, content)

            const submitQuestionButtonSelector = '.modal_content_inner button.qu-bg--blue'
            await page.click(submitQuestionButtonSelector)

            const message = await page.evaluate(async () => {
                const message = await new Promise(resolve => {
                    const container = document.querySelector('#root')
                
                    const mutationCallback = function (mutationsList, observer) {
                        for (const mutation of mutationsList) {
                            if (mutation.type === 'childList') {
                                if (mutation.addedNodes.length) {
                                    resolve(mutation.addedNodes[0].innerText)
                                    observer.disconnect()
                                }
                            }
                        }
                    }
                
                    const mutationObserver = new MutationObserver(mutationCallback)
                    mutationObserver.observe(container, {childList: true})
                })

                return message
            })

            if (message.includes('Cette question a besoin de plus de détails')) {
                await browser.close()
                reject(new Error('Bad Question'))
            }

            if (! message.includes('Question posée avec succès')) {
                await browser.close()
                reject(new Error('Unknown Error : "' + message + '"'))
            }
            
            console.log(message)

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
