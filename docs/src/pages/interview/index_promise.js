// 控制并发请求数
/**
 * 
 * @param {Array} urls 请求的url
 * @param {number} maxNum 最大并发请求数
 * @description 控制并发请求数，每次最多请求maxNum
 */
function concurRequest(urls, maxNum) {
    if (urls.length == 0) return Promise.resolve([])
    return new Promise((resolve, reject) => {
        let index = 0
        let result = []
        let count = 0
        async function defaultRequset() {
            const i = index
            index++
            try {
                const res = await fetch(urls[i])
                result[i] = res
            } catch (e) {
            } finally {
                count++
                if (count < urls.length) defaultRequset()
                if (count === urls.length) resolve(result)
            }
        }
        for (let i = 0; i < Math.min(maxNum, urls.length); i++) {
            defaultRequset()
        }
    })
}


//请求错误重试