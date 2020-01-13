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

import * as vscode from "vscode";
import * as brightside from "@brightside/core";
import * as profileLoader from "../../../src/Profiles";
import { MvsCommandHandler } from "../../../src/command/MvsCommandHandler";
import * as extension from "../../../src/extension";
import * as utils from "../../../src/utils";

describe("tsoCommandActions unit testing", () => {
    const showErrorMessage = jest.fn();
    const showInputBox = jest.fn();
    const showInformationMessage = jest.fn();
    const showQuickPick = jest.fn();
    // const issueSimple = jest.fn();
    const IssueCommand = jest.fn();
    const getConfiguration = jest.fn();
    const createOutputChannel = jest.fn();

    const appendLine = jest.fn();
    const outputChannel: vscode.OutputChannel = {
        append: jest.fn(),
        name: "fakeChannel",
        appendLine,
        clear: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn()
    };
    createOutputChannel.mockReturnValue(outputChannel);
    const qpItem: vscode.QuickPickItem = new utils.FilterDescriptor("\uFF0B " + "Create a new filter");

    const mockLoadNamedProfile = jest.fn();
    Object.defineProperty(profileLoader.Profiles, "createInstance", {
        value: jest.fn(() => {
            return {
                allProfiles: [{name: "firstName"}, {name: "secondName"}],
                defaultProfile: {name: "firstName"}
            };
        })
    });

    const ProgressLocation = jest.fn().mockImplementation(() => {
        return {
            Notification: 15
        };
    });
    const submitResponse = {
        success: true,
        commandResponse: "d iplinfo.."
    };

    const withProgress = jest.fn().mockImplementation(() => {
        return submitResponse;
    });

    Object.defineProperty(vscode.window, "showErrorMessage", {value: showErrorMessage});
    Object.defineProperty(vscode.window, "showInputBox", {value: showInputBox});
    Object.defineProperty(vscode.window, "showInformationMessage", {value: showInformationMessage});
    Object.defineProperty(vscode.window, "showQuickPick", {value: showQuickPick});
    Object.defineProperty(vscode.workspace, "getConfiguration", {value: getConfiguration});
    Object.defineProperty(vscode.window, "createOutputChannel", {value: createOutputChannel});
    Object.defineProperty(brightside, "IssueCommand", {value: IssueCommand});
    Object.defineProperty(vscode, "ProgressLocation", {value: ProgressLocation});
    Object.defineProperty(vscode.window, "withProgress", {value: withProgress});

    beforeEach(() => {
        mockLoadNamedProfile.mockReturnValue({profile: {name:"aProfile", type:"zosmf"}});
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName"}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    loadNamedProfile: mockLoadNamedProfile
                };
            })
        });
        getConfiguration.mockReturnValue({
            get: (setting: string) => undefined,
            update: jest.fn(()=>{
                return {};
            })
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });


    const tsoActions = MvsCommandHandler.getInstance();

    it("tests the issueTsoCommand function - theia route", async () => {
        const originalTheia = extension.ISTHEIA;
        Object.defineProperty(extension, "ISTHEIA", { get: () => true });
        // First run enters a command directly
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:"firstName", password: "12345"}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    zosmfProfile: mockLoadNamedProfile
                };
            })
        });

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce("/d iplinfo");
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );
        // withProgress.mockReturnValueOnce({commandResponse: "fake response"});

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(showInputBox.mock.calls.length).toBe(1);
        expect(appendLine.mock.calls.length).toBe(2);
        expect(appendLine.mock.calls[0][0]).toBe("> d iplinfo");
        expect(appendLine.mock.calls[1][0]).toBe(submitResponse.commandResponse);
        expect(showInformationMessage.mock.calls.length).toBe(0);

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();

        // Second run selects previously added run
        showQuickPick.mockReturnValueOnce("firstName");
        showQuickPick.mockReturnValueOnce({label: "d iplinfo"});
        // withProgress.mockReturnValueOnce({commandResponse: "fake response"});
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(2);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(showQuickPick.mock.calls[1][0][1]).toEqual(new utils.FilterItem("d iplinfo"));
        expect(withProgress.mock.calls.length).toBe(1);
        // expect(withProgress.mock.calls[0][1]).toEqual({label: "d iplinfo"});

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();

        // Third run selects an alternative value
        showQuickPick.mockReturnValueOnce("firstName");
        showQuickPick.mockReturnValueOnce(new utils.FilterItem("/d m=cpu"));
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );
        // withProgress.mockReturnValueOnce({commandResponse: "fake response"});

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(2);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(withProgress.mock.calls.length).toBe(1);
        // expect(withProgress.mock.calls[0][1]).toEqual("d m=cpu");

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();
        showInformationMessage.mockReset();

        showQuickPick.mockReturnValueOnce("firstName");
        showQuickPick.mockReturnValueOnce(undefined);
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );

        await tsoActions.issueTsoCommand();

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No selection made.");

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();

        Object.defineProperty(extension, "ISTHEIA", { get: () => originalTheia });
    });
});
