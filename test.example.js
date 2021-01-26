// Copy this file to test.js
// You can then test using npm test

import post from './index.js'

(async () => {
    console.log(await post(
        'Quora email',
        'Quora password',
        'Post content',
        'Post Link if needed'
        {show: true}
    ))
})()
