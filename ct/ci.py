import os
import shutil
import sys

import common.ansicolorsutils as ansicolors_utils
import common.commandutil as command_util
import common.fileutils as fileutils
import common.timeutils as timeutils
import config.setting as setting
import service.code_pipeline_api as code_pipeline_api

# 前端项目中不同环境页面存放的目录名称

DEV_PAGE_DIR = '1506-develop'
TEST_PAGE_DIR = '1507-test'
INNER_PAGE_DIR = '1505-stable'
PRE_HTTP_PAGE_DIR = '2505-pre'
ONLINE_PAGE_DIR = '80-static'

class FrontBuilder(object):
def **init**(self): # 任务名
self.job_name = None # 构建ID
self.build_num = None # 构建上下文
self.context = {} # 服务代号
self.service_code = None # 构建版本号
self.version_num = None # 构建目录
self.**build_dir = None # 发布目录
self.**publish_dir = None # 构建 署环境类型
self.env_type = None # 工作根目录
self.workspace_dir = None
self.repository_url = None
self.branch_name = None # 启用环境编译参数
self.enable_env_build = False
self.build_param = None
self.build_ext_param = "" # 提交id
self.commit_id = ""

    '''
    构建前处理，环节变量参数设置
    '''

    def __pre_build(self):
        if self.build_param:
            self.enable_env_build = True

        self.__publish_dir = os.path.join(self.workspace_dir, self.service_code.lower() + '_' + self.env_type.lower())
        # 创建资源发布目录
        os.mkdir(self.__publish_dir)

        self.__build_dir = os.path.join(self.workspace_dir, "dist")
        if os.path.exists(self.__build_dir):
            shutil.rmtree(self.__build_dir)

        self.context["JenkinsJobName"] = self.job_name
        self.context["BuildNum"] = self.build_num
        self.context["ExecTimestamp"] = timeutils.get_timestamp()
        self.context["Status"] = setting.JobStatus.OnExecuting.value
        self.context["ServiceCode"] = self.service_code
        self.context["Version"] = self.version_num
        self.context["PublishDir"] = self.__publish_dir
        self.context["BuildDir"] = self.__build_dir
        self.context["Env"] = self.env_type
        self.context["RepositoryUrl"] = self.repository_url
        self.context["BranchName"] = self.branch_name
        self.commit_id = command_util.exec_command_check_output("git rev-parse HEAD")
        self.context["CommitId"] = self.commit_id

        print(self.context)

    '''
    构建项目
    '''

    def __build_project(self):
        print("build_project start", self.build_ext_param)
        lock_file_path = os.path.join(self.workspace_dir, "pnpm-lock.yaml")
        use_pnpm = os.path.exists(lock_file_path)
        print("use_pnpm": use_pnpm)
        if use_pnpm:
             code = command_util.exec_command("pnpm i --verbose")
             if code != 0:
                 raise Exception("pnpm install failed")
        else:
            code = command_util.exec_command("npm i --verbose")
            if code != 0:
                raise Exception('npm install failed')

        command = "npm run build " + self.build_ext_param + " --verbose"
        if self.enable_env_build:
            command = "npm run build:" + self.env_type + " " + self.build_ext_param + " --verbose"

        print("build command：" + command)

        code = command_util.exec_command(command)
        if code != 0:
            raise Exception('npm run build failed')

        source_dir = os.path.join(self.__build_dir, 'assets')
        if os.path.exists(source_dir):
            # 拷贝资源文件到发布目录
            target_dir = os.path.join(self.__publish_dir, 'assets')
            shutil.copytree(source_dir, target_dir)
            print("copy assets folder success," + source_dir + " to " + target_dir)
        else:
            print("assets folder not exists :" + source_dir)

        pages_dir = self.__get_page_dir()
        if os.path.exists(pages_dir):
            target_page_dir = os.path.join(self.__publish_dir, "pages")
            shutil.copytree(pages_dir, target_page_dir)
            print("copy pages folder success," + pages_dir + " to " + target_page_dir)
        else:
            print("pages folder not exists :" + pages_dir)

        ansicolors_utils.info_print('build_project success')

    '''
    页面文件路径
    '''

    def __get_page_dir(self):
        if self.env_type == "dev":
            return os.path.join(self.__build_dir, DEV_PAGE_DIR)
        if self.env_type == "test":
            return os.path.join(self.__build_dir, TEST_PAGE_DIR)
        if self.env_type == "pre":
            return os.path.join(self.__build_dir, PRE_HTTP_PAGE_DIR)
        if self.env_type == "online":
            return os.path.join(self.__build_dir, ONLINE_PAGE_DIR)

        return os.path.join(self.__build_dir, INNER_PAGE_DIR)

    '''
    打包程序
    '''

    def __upload_program_package(self):
        os.chdir(self.__build_dir)
        pack_file_name = (self.service_code + "_" + self.env_type).lower()
        zip_file = pack_file_name + ".zip"
        fileutils.make_zipfile(self.__publish_dir, self.__build_dir, zip_file)

        pack_md5 = fileutils.calc_md5(zip_file)

        self.context["PackagePath"] = zip_file
        self.context["PackageName"] = zip_file
        self.context["PackageMd5"] = pack_md5
        self.context["ImageName"] = ""

        code_pipeline_api.upload_package(self.context)
        ansicolors_utils.info_print('upload_program_package success')

    def main_run(self):
        try:
            self.__pre_build()
            self.__build_project()
            self.__upload_program_package()
            self.context["Status"] = setting.JobStatus.ExecSuccess.value
        except Exception as ex:
            ansicolors_utils.error_print('exec error' + repr(ex))
            self.context["CompleteTimestamp"] = timeutils.get_timestamp()
            self.context["Status"] = setting.JobStatus.ExecFailed.value
            sys.exit(1)
        finally:
            self.context["CompleteTimestamp"] = timeutils.get_timestamp()
            code_pipeline_api.job_callback(self.context)

if **name** == '**main**':
import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--jobname', help='任务名称')
    parser.add_argument('--buildnum', help='构建编号')
    parser.add_argument('--etype', help='环境类型')
    parser.add_argument('--scode', help='服务代号')
    parser.add_argument('--ver', help='版本号')
    parser.add_argument('--ws', help='工作目录')
    parser.add_argument('--repositoryurl', help='仓库地址')
    parser.add_argument('--branchname', help='分支名称')
    parser.add_argument('--enableEnvBuild', help='启用环境构建参数')
    parser.add_argument('--buildparam', help='环境构建参数')
    parser.add_argument('--buildextparam', help='自定义构建扩展参数')

    args, unknown = parser.parse_known_args()
    builder = FrontBuilder()
    builder.job_name = args.jobname
    builder.build_num = args.buildnum
    builder.env_type = args.etype
    builder.service_code = args.scode
    builder.version_num = args.ver
    builder.workspace_dir = args.ws
    builder.repository_url = args.repositoryurl
    builder.branch_name = args.branchname
    builder.enable_env_build = True if str(args.enableEnvBuild).lower() == "true" else False
    builder.build_param = args.buildparam

    if args.buildextparam is None or args.buildextparam == "-" or args.buildextparam == "foo":
        builder.build_ext_param = ""
    else:
        builder.build_ext_param = args.buildextparam

    builder.main_run()
