const fs  = require('fs');
const exec = require('child_process').exec;
const { IS_OK , IS_INCOMPLETE , IS_TIMEOUT , IS_LIE , IS_SKIPPED , IS_CRASHED } = require('../lib/errors');

async function reason(filePath, config) {
    return new Promise( (resolve) => {
        if (config.type === 'skip') {
            resolve(IS_SKIPPED);
            return;
        }

        try {
            const command = `${config.eye.path} ${config.eye.args} ${filePath} > ${filePath}.out 2>&1`;
            exec(command, { 
                timeout: config.eye.timeout * 1000 ,
                killSignal: 'SIGKILL',
                windowsHide: true
            } , (error) => {
                if (error && error.killed) {
                    resolve(IS_TIMEOUT);
                    return;
                }

                const output = fs.readFileSync(`${filePath}.out`, { encoding: 'utf-8'});

                if (config.type == 'normal' && output.match(/.*:test.*is.*true/g)) {
                    resolve(IS_OK);
                }
                else if (config.type == 'normal' && output.match(/inference_fuse/g)) {
                    resolve(IS_LIE);
                }
                else if (config.type == 'lie' && output.match(/.*:test.*is.*true/g)) {
                    resolve(IS_LIE);
                }
                else if (config.type == 'lie' && output.match(/^\s*$/g)) {
                    resolve(IS_OK);
                }
                else if (config.type == 'fail' && output.match(/inference_fuse/g)) {
                    resolve(IS_OK);
                }
                else if (config.type == 'fail' && output.match(/.*:test.*is.*true/g)) {
                    resolve(IS_LIE);
                }
                else {
                    resolve(IS_INCOMPLETE);
                }
            });
        }
        catch (e) {
            console.error(e);
            resolve(IS_CRASHED);
        }
    });
}

module.exports = { reason };