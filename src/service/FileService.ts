import * as fs from "fs";
import * as JSON5 from "json5";

export class FileService {
  public static getJSON5File<T>(filePath: string, defaultVal: T): T {
    let json: T = defaultVal;
    try {
      json = JSON5.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.error(err);
    }
    return json;
  }

  public static writeFile(filePath: string, data: string): boolean {
    if (!data) {
      console.error(
        new Error(
          "Unable to write file. FilePath :" + filePath + " Data :" + data
        )
      );
      return false;
    }
    try {
      fs.writeFileSync(filePath, data);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
}
