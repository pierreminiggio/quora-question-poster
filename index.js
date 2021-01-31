import puppeteer from 'puppeteer'
import type from '@pierreminiggio/puppeteer-text-typer'

/**
 * @typedef {Object} QuoraQuestionPosterConfig
 * @property {boolean} show default false
 * 
 * @param {string} login
 * @param {string} password
 * @param {string} content
 * @param {?string} link
 * @param {QuoraQuestionnfig} config 
 * 
 * @returns {Promise<string>}
 */
export default function (login, password, content, link, config = {}) {

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
            await page.waitForSelector(buttonSelector)

            await page.waitForTimeout(3000)

            await page.evaluate((loginInputSelector, passwordInputSelector, login, password) => {
                document.querySelector(loginInputSelector).value = login
                document.querySelector(passwordInputSelector).value = password
            }, loginInputSelector, passwordInputSelector, login, password)

            await page.evaluate(buttonSelector => {
                const button = document.querySelector(buttonSelector)
                button.className = 'submit_button'
                button.click()
            }, buttonSelector)

            // Ask a question
            const askQuestionButtonSelector = 'button'
            try {
                await page.waitForSelector(askQuestionButtonSelector)
            } catch (e) {
                await browser.close()
                reject('You are likely banned from quora')
                return
            }
            
            await page.click(askQuestionButtonSelector)

            const questionInputSelector = 'textarea'
            await page.waitForSelector(questionInputSelector)
            await type(page, questionInputSelector, content.trim() + ' ')

            if (link !== null) {
                const linkInputSelector = 'input'
                await page.waitForSelector(linkInputSelector)
                await type(page, linkInputSelector, link)
            }

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

                    setTimeout(() => resolve('Question déjà posée ?'), 10000)
                })

                return message
            })

            if (message === 'Question déjà posée ?') {
                await browser.close()
                reject(new Error('Maybe Already Posted Question'))
            }

            if (message.includes('Cette question a besoin de plus de détails')) {
                await browser.close()
                reject(new Error('Bad Question'))
            }

            if (! message.includes('Question posée avec succès')) {
                await browser.close()
                reject(new Error('Unknown Error : "' + message + '"'))
            }

            /**
             * Accept all confirms
             */
            page.on('dialog', async dialog => {
                await dialog.accept()
            })
            
            const finishButtonSelector = '.modal_content_inner>div>div>div+div+div .puppeteer_test_modal_primary_button>button'
            await page.waitForSelector(finishButtonSelector)
            await page.click(finishButtonSelector)

            await page.waitForTimeout(3000)

            /**
             * Invite to answser
             */
            await page.evaluate(() => {
                const buttonsToClick = Array.from(document.querySelectorAll(
                    '.modal_content_inner>div>div>div+div>div+div+div.q-flex>div+div .q-click-wrapper'
                )).slice(0, 26)
                console.log(buttonsToClick)
                buttonsToClick.forEach(button => button.click())
            })

            await page.waitForTimeout(3000)

            const finallyFinishButtonSelector = '.q-box[style*="display: initial"]>div>div>div>div+.modal_content_inner>div>div>div+div+div .puppeteer_test_modal_primary_button>button'
            await page.waitForSelector(finallyFinishButtonSelector)
            await page.click(finallyFinishButtonSelector)

            await page.waitForTimeout(10000)
            
            await page.goto('https://fr.quora.com/content')

            const lastQuestionLinkSelector = '.question_link'
            await page.waitForSelector(lastQuestionLinkSelector)

            const quoraId = await page.evaluate(lastQuestionLinkSelector => {
                return document.querySelector(lastQuestionLinkSelector).href.split('https://fr.quora.com/unanswered/')[1]
            }, lastQuestionLinkSelector)

            await browser.close()
            resolve(quoraId)
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
