import WebsqlLogger from './websql';
import LocalStorageLogger from './localStorage';
import IndexedDBLogger from './indexedDB';
import * as util from './lib/util';


class Logline {
    constructor(namespace) {
        Logline._checkProtocol();
        return new Logline._protocol(namespace);
    }

    // 检查协议
    static _checkProtocol() {
        if (!Logline._protocol) {
            util.throwError('you must choose a protocol with "using" method.');
        }
    }

    // 获取所有日志
    static getAll(readyFn) {
        Logline._checkProtocol();
        Logline._protocol.all(function(logs) {
            readyFn(logs);
        });
    }

    // 发送日志
    static deploy(descriptor, tickerFn, readyFn, errorFn) {
        Logline._checkProtocol();
        if (Logline._reportTo) {
            Logline._protocol.all(function(logs) {
                var xhr = new XMLHttpRequest(),
                    logsToSend = [],
                    log, key, line;

                xhr.upload.onprogress = tickerFn;
                xhr.onload = function() {
                    if (200 === xhr.status) {
                        'function' === typeof readyFn && readyFn();
                    }
                    else {
                        'function' === typeof errorFn && errorFn();
                    }
                };
                xhr.onerror = function() {
                    'function' === typeof errorFn && errorFn();
                };
                xhr.open('POST', Logline._reportTo);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

                // 处理logs成常见的日志形式来上报(一行一条日志内容)，避免重复键名占用空间
                while ((log = logs.pop())) {
                    line = [];
                    for (key in log) {
                        if (log.hasOwnProperty(key) && log[key]) {
                            line.push(log[key]);
                        }
                    }
                    logsToSend.push(line.join('\t'));
                }

                xhr.withCredentials = true;
                logsToSend.unshift(location.host + (descriptor ? (': ' + descriptor) : ''));
                xhr.send('data=' + (escape(logsToSend.join('\n')) || 'no data'));
            });
        }
        else {
            util.throwError('report address is not configed.');
        }
    }

    // 清理日志
    static keep(daysToMaintain) {
        try {
            Logline._checkProtocol();
            Logline._protocol.keep(daysToMaintain);
        } catch (e) {
            util.throwError('unable to remove logs earlier than ' + daysToMaintain + 'd.');
        }
        return this;
    }

    // 清空日志并删除数据库
    static clean() {
        try {
            Logline._checkProtocol();
            Logline._protocol.clean();
        } catch (e) { util.throwError('unable to clean log database.'); }
        return this;
    }

    // 选择一个日志协议
    static using(protocol) {
        // 协议一旦选定即不允许在运行时更改
        if (Logline._protocol) {
            return this;
        }

        if (-1 < Object.values(Logline.PROTOCOL).indexOf(protocol)) {
            Logline._protocol = protocol;
            Logline.init();
        }
        else {
            util.throwError('specialfied protocol is not available.');
        }

        return this;
    }

    // 初始化选定的协议
    static init() {
        Logline._checkProtocol();
        Logline._protocol.init();

        return this;
    }

    // 配置日志上报地址
    static reportTo(reportTo) {
        Logline._reportTo = reportTo;
        return this;
    }
}

Logline.PROTOCOL = {
    WEBSQL: WebsqlLogger,
    LOCALSTORAGE: LocalStorageLogger,
    INDEXEDDB: IndexedDBLogger
};

module.exports = Logline;
