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
import * as utils from "../../../src/utils";

describe("tsoCommandActions unit testing", () => {
    const showErrorMessage = jest.fn();
    const showInputBox = jest.fn();
    const showInformationMessage = jest.fn();
    const showQuickPick = jest.fn();
    const createQuickPick = jest.fn();
    const issueSimple = jest.fn();
    const getConfiguration = jest.fn();
    const IssueCommand = jest.fn();
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
    const qpItem2 = new utils.FilterItem("/d iplinfo");

    const mockLoadNamedProfile = jest.fn();
    Object.defineProperty(profileLoader.Profiles, "createInstance", {
        value: jest.fn(() => {
            return {
                allProfiles: [{name: "firstName"}, {name: "secondName"}],
                defaultProfile: {name: "firstName"}
            };
        })
    });

    createQuickPick.mockReturnValue({
        placeholder: "Choose \"Create new...\" to define a new profile or select an existing profile to Add to the Data Set Explorer",
        activeItems: [qpItem2],
        ignoreFocusOut: true,
        items: [qpItem, qpItem2],
        value: undefined,
        show: jest.fn(()=>{
            return {};
        }),
        hide: jest.fn(()=>{
            return {};
        }),
        onDidAccept: jest.fn(()=>{
            return {};
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
    Object.defineProperty(vscode.window, "createQuickPick", {value: createQuickPick});
    Object.defineProperty(vscode.workspace, "getConfiguration", {value: getConfiguration});
    Object.defineProperty(brightside, "IssueCommand", {value: IssueCommand});
    Object.defineProperty(IssueCommand, "issueSimple", {value: issueSimple});
    Object.defineProperty(vscode.window, "createOutputChannel", {value: createOutputChannel});
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

    it("tests the issueTsoCommand function", async () => {
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:"firstName", password: "12345"}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    zosmfProfile: mockLoadNamedProfile
                };
            })
        });

        showQuickPick.mockReset();
        showInputBox.mockReset();

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce("/d iplinfo");
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );
        issueSimple.mockReturnValueOnce({commandResponse: "fake response"});

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
    });

    it("tests the issueTsoCommand function - issueSimple throws an error", async () => {
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:"firstName", password: "12345"}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    zosmfProfile: mockLoadNamedProfile
                };
            })
        });

        showQuickPick.mockReset();
        showInputBox.mockReset();

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce("/d iplinfo");
        withProgress.mockRejectedValueOnce(Error("fake testError"));
        issueSimple.mockRejectedValueOnce(Error("fake testError"));
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(showInputBox.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual("fake testError");
    });

    it("tests the issueTsoCommand function user escapes the quick pick box", async () => {
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:"firstName", password: "12345"}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    zosmfProfile: mockLoadNamedProfile
                };
            })
        });

        showQuickPick.mockReset();
        showInputBox.mockReset();

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce("/d iplinfo");
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(undefined)
        );

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No selection made.");
    });

    it("tests the issueTsoCommand function user escapes the command box", async () => {
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:"firstName", password: "12345"}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    zosmfProfile: mockLoadNamedProfile
                };
            })
        });

        showQuickPick.mockReset();
        showInputBox.mockReset();

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce(undefined);
        issueSimple.mockReturnValueOnce({commandResponse: "fake response"});
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(showInputBox.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No command entered.");
    });

    it("tests the issueTsoCommand function no profiles error", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [],
                    defaultProfile: undefined,
                };
            })
        });
        await tsoActions.issueTsoCommand();
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No profiles available");
    });

    it("tests the issueTsoCommand prompt credentials", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();

        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    promptCredentials: jest.fn(()=> {
                        return ["fake", "fake", "fake"];
                    }),
                };
            })
        });

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce("fake");
        showInputBox.mockReturnValueOnce("fake");
        showInputBox.mockReturnValueOnce("/d iplinfo");
        issueSimple.mockReturnValueOnce({commandResponse: "fake response"});
        showQuickPick.mockReturnValueOnce("\uFF0B" + "Create a new Command");
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(showInputBox.mock.calls.length).toBe(1);
    });

    it("tests the issueTsoCommand prompt credentials for password only", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();

        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    promptCredentials: jest.fn(()=> {
                        return ["fake", "fake", "fake"];
                    }),
                };
            })
        });

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce("fake");
        showInputBox.mockReturnValueOnce("/d iplinfo");
        issueSimple.mockReturnValueOnce({commandResponse: "fake response"});
        showQuickPick.mockReturnValueOnce("\uFF0B" + "Create a new Command");
        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );

        await tsoActions.issueTsoCommand();

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command"
        });
        expect(showInputBox.mock.calls.length).toBe(1);
    });

    it("tests the issueTsoCommand error in prompt credentials", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();

        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                };
            })
        });

        showQuickPick.mockReturnValueOnce("firstName");
        showInputBox.mockReturnValueOnce("fake");
        showInputBox.mockReturnValueOnce("/d iplinfo");

        jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );

        await tsoActions.issueTsoCommand();

        expect(showErrorMessage.mock.calls.length).toBe(1);
    });
});
