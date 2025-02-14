//定义copy
const fs = require('fs');
const path = require('path');
const copy = async (source, address) => {
    const currentDir = process.cwd();
    const sourcePath = path.join(currentDir, source);
    const targetPath = path.join(address, source);
    try {
        await fs.promises.copyFile(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
    } catch (error) {
        console.log(error);
    }
}




const cac = require('cac');
const cli = cac();

cli.option("--r, --resource [resource]", "set resource file")
    .option("--d , --destination [destination]", "set destination file");

const parsed = cli.parse();

const getFiles = (parsed) => {
    //console.log(parsed, 'parsed....');
    const options = parsed.options;
    let resource = options.resource || options.r;
    let destination = options.destination || options.d;
    if (!resource && !destination) {
        console.log(parsed.args.slice(0, 2));
        return parsed.args.slice(0, 2);
    }
    if (!resource) {
        console.log([parsed.args[0], destination])
        return [parsed.args[0], destination];
    }
    if (!destination) {
        console.log([resource, parsed.args[1]])

        return [resource, parsed.args[1]];
    }
    return [resource, destination];
}


copy(...getFiles(parsed));

