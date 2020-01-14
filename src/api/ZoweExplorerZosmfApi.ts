/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import * as zowe from "@brightside/core";
import * as imperative from "@brightside/imperative";

import { ZoweExplorerApi } from "./ZoweExplorerApi";

// tslint:disable: max-classes-per-file

/**
 * An implementation of the Zowe Explorer API Common interface for zOSMF.
 */
class ZosmfApiCommon implements ZoweExplorerApi.ICommon {
    public static getProfileTypeName(): string {
        return "zosmf";
    }

    private session: imperative.Session;
    constructor(public profile?: imperative.IProfileLoaded) {
    }

    public getProfileTypeName(): string {
        return ZosmfUssApi.getProfileTypeName();
    }

    public getSession(profile?: imperative.IProfileLoaded): imperative.Session {
        if (!this.session) {
            this.session = zowe.ZosmfSession.createBasicZosmfSession((profile||this.profile).profile);
        }
        return this.session;
    }
}

/**
 * An implementation of the Zowe Explorer USS API interface for zOSMF.
 */
export class ZosmfUssApi extends ZosmfApiCommon implements ZoweExplorerApi.IUss {

    public async fileList(path: string): Promise<zowe.IZosFilesResponse> {
        return zowe.List.fileList(this.getSession(), path);
    }

    public async isFileTagBinOrAscii(USSFileName: string): Promise<boolean> {
        return zowe.Utilities.isFileTagBinOrAscii(this.getSession(), USSFileName);
    }

    public async getContents(ussFileName: string, options: zowe.IDownloadOptions
    ): Promise<zowe.IZosFilesResponse> {
        return zowe.Download.ussFile(this.getSession(), ussFileName, options);
    }

    public async putContents(inputFile: string, ussname: string,
                             binary?: boolean, localEncoding?: string,
                             etag?: string, returnEtag?: boolean): Promise<zowe.IZosFilesResponse> {
        return zowe.Upload.fileToUSSFile(this.getSession(), inputFile, ussname, binary, localEncoding, etag, returnEtag);
    }
    public async create(ussPath: string, type: string, mode?: string): Promise<string> {
        return zowe.Create.uss(this.getSession(), ussPath, type);
    }

    public async delete(fileName: string, recursive?: boolean): Promise<zowe.IZosFilesResponse> {
        // handle zosmf api issue with file paths
        const fixedName = fileName.startsWith("/") ?  fileName.substring(1) :  fileName;
        return zowe.Delete.ussFile(this.getSession(), fixedName, recursive);
    }

    public async rename(oldFilePath: string, newFilePath: string): Promise<zowe.IZosFilesResponse> {
        const result = await zowe.Utilities.renameUSSFile(this.getSession(), oldFilePath, newFilePath);
        return {
            success: true,
            commandResponse: null,
            apiResponse: result
        };
    }
}

/**
 * An implementation of the Zowe Explorer MVS API interface for zOSMF.
 */
export class ZosmfMvsApi extends ZosmfApiCommon implements ZoweExplorerApi.IMvs {

    public async dataSet(filter: string, options?: zowe.IListOptions
        ): Promise<zowe.IZosFilesResponse>{
        return zowe.List.dataSet(this.getSession(), filter, options);
    }

    public async allMembers(dataSetName: string, options?: zowe.IListOptions
        ): Promise<zowe.IZosFilesResponse> {
        return zowe.List.allMembers(this.getSession(), dataSetName, options);
    }

    public async getContents(name: string, options?: zowe.IDownloadOptions
        ): Promise<zowe.IZosFilesResponse> {
        return zowe.Download.dataSet(this.getSession(), name, options);
    }

    public async putContents(inputPath: string, dataSetName: string, options?: zowe.IUploadOptions
        ): Promise<zowe.IZosFilesResponse> {
        return zowe.Upload.pathToDataSet(this.getSession(), inputPath, dataSetName, options);
    }

    public async createDataSet(cmdType: zowe.CreateDataSetTypeEnum, dataSetName: string, options?: Partial<zowe.ICreateDataSetOptions>
        ): Promise<zowe.IZosFilesResponse> {
        return zowe.Create.dataSet(this.getSession(), cmdType, dataSetName, options);
    }

    public async createDataSetMember(dataSetName: string, options?: zowe.IUploadOptions
        ): Promise<zowe.IZosFilesResponse> {
        return zowe.Upload.bufferToDataSet(this.getSession(), Buffer.from(""), dataSetName, options);
    }

    public async copyDataSetMember(
        { dataSetName: fromDataSetName, memberName: fromMemberName }: zowe.IDataSet,
        { dataSetName: toDataSetName, memberName: toMemberName }: zowe.IDataSet,
        options?: {replace?: boolean}
    ): Promise<zowe.IZosFilesResponse> {
        return zowe.Copy.dataSet(this.getSession(),
            { dataSetName: fromDataSetName, memberName: fromMemberName },
            { dataSetName: toDataSetName, memberName: toMemberName },
            options
        );
    }

    public async renameDataSet(beforeDataSetName: string, afterDataSetName: string
        ): Promise<zowe.IZosFilesResponse> {
        return zowe.Rename.dataSet(this.getSession(), beforeDataSetName, afterDataSetName);
    }

    public async renameDataSetMember(dataSetName: string, beforeMemberName: string, afterMemberName: string,
    ): Promise<zowe.IZosFilesResponse> {
        return zowe.Rename.dataSetMember(this.getSession(), dataSetName, beforeMemberName, afterMemberName);
    }

    public async deleteDataSet(dataSetName: string, options?: zowe.IDeleteDatasetOptions
        ): Promise<zowe.IZosFilesResponse> {
            return zowe.Delete.dataSet(this.getSession(), dataSetName);
    }
}

/**
 * An implementation of the Zowe Explorer JES API interface for zOSMF.
 */
export class ZosmfJesApi extends ZosmfApiCommon implements ZoweExplorerApi.IJes {

    public getJobsByOwnerAndPrefix(owner: string, prefix: string): Promise<zowe.IJob[]> {
        return zowe.GetJobs.getJobsByOwnerAndPrefix(this.getSession(), owner, prefix);
    }

    public getJob(jobid: string): Promise<zowe.IJob> {
        return zowe.GetJobs.getJob(this.getSession(), jobid);
    }

    public getSpoolFiles(jobname: string, jobid: string): Promise<zowe.IJobFile[]> {
        return zowe.GetJobs.getSpoolFiles(this.getSession(), jobname, jobid);
    }

    public downloadSpoolContent(parms: zowe.IDownloadAllSpoolContentParms): Promise<void> {
        return zowe.DownloadJobs.downloadAllSpoolContentCommon(this.getSession(), parms);
    }

    public getSpoolContentById(jobname: string, jobid: string, spoolId: number): Promise<string> {
        return zowe.GetJobs.getSpoolContentById(this.getSession(), jobname, jobid, spoolId);
    }

    public getJclForJob(job: zowe.IJob): Promise<string> {
        return zowe.GetJobs.getJclForJob(this.getSession(), job);
    }

    public submitJcl(jcl: string, internalReaderRecfm?: string, internalReaderLrecl?: string): Promise<zowe.IJob> {
        return zowe.SubmitJobs.submitJcl(this.getSession(), internalReaderRecfm, internalReaderLrecl);
    }

    public submitJob(jobDataSet: string): Promise<zowe.IJob> {
        return zowe.SubmitJobs.submitJob(this.getSession(), jobDataSet);
    }
}