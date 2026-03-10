# 第一阶段：构建阶段 - 安装依赖
FROM swr.cn-north-4.myhuaweicloud.com/opensourceway/node:latest as Builder

RUN mkdir -p /home/mindspore/web
WORKDIR /home/mindspore/web
COPY . /home/mindspore/web

# 修改：使用 npm 安装依赖（原来是 pnpm build，但本项目不需要构建）
RUN npm install --production

# 第二阶段：运行阶段 - 使用 openEuler base 镜像
# 注意：需要从 Builder 阶段复制 node 和 npm，因为 base 镜像没有 Node.js
FROM swr.cn-north-4.myhuaweicloud.com/opensourceway/openeuler/base:latest

# 修改：定义 Node.js 应用相关的环境变量（原来是 Nginx 相关变量）
ENV APP_USER=nodejs
ENV APP_GROUP=nodejs
ENV APP_HOME=/home/mindspore/web
ENV NODE_ENV=production
ENV PORT=3000

# 修改：从 Builder 阶段复制 Node.js 运行时和应用代码（原来是复制 Nginx）
COPY --from=Builder /usr/local/bin/node /usr/local/bin/node
COPY --from=Builder /usr/local/bin/npm /usr/local/bin/npm
COPY --from=Builder /home/mindspore/web /home/mindspore/web

# 保留：配置 yum 源镜像加速
RUN sed -i "s|repo.openeuler.org|mirrors.nju.edu.cn/openeuler|g" /etc/yum.repos.d/openEuler.repo \
    && sed -i '/metalink/d' /etc/yum.repos.d/openEuler.repo \
    && sed -i '/metadata_expire/d' /etc/yum.repos.d/openEuler.repo \
    && yum update -y \
    # 修改：只安装必要的工具（移除 nginx 相关依赖 pcre-devel libmaxminddb）
    && yum install -y findutils passwd shadow net-tools \
    # 保留：创建非 root 用户运行服务
    && groupadd -g 1000 $APP_GROUP \
    && useradd -u 1000 -g $APP_GROUP -s /sbin/nologin $APP_USER \
    && sed -i '/^PATH="\$HOME\/\.local\/bin:\$HOME\/bin:\$PATH"/d; /^export PATH/d' /home/$APP_USER/.bashrc \
    # 修改：设置应用目录权限（原来是 nginx 目录）
    && chown -R $APP_USER:$APP_GROUP $APP_HOME \
    && find $APP_HOME -type d -print0 | xargs -0 chmod 750 \
    && find $APP_HOME -type f -print0 | xargs -0 chmod 640 \
    # 修改：创建日志目录（原来是 nginx 日志）
    && mkdir -p /var/log/mcp \
    && chown -R $APP_USER:$APP_GROUP /var/log/mcp \
    && chmod -R 750 /var/log/mcp \
    && touch /var/log/mcp/app.log \
    && chmod 640 /var/log/mcp/app.log \
    # 保留：设置系统日志权限
    && chmod 640 /var/log/dnf.librepo.log \
    && chmod 640 /var/log/dnf.log \
    && chmod 640 /var/log/dnf.rpm.log \
    && chmod 640 /var/log/hawkey.log \
    && chmod 640 /var/log/*.log \
    # 保留：安全加固 - 设置 umask 和禁用历史记录
    && echo "umask 0027" >> /etc/bashrc \
    && echo "set +o history" >> /etc/bashrc \
    && sed -i "s|HISTSIZE=1000|HISTSIZE=0|" /etc/profile \
    # 保留：密码策略配置
    && sed -i "s/PASS_MAX_DAYS.*/PASS_MAX_DAYS 30/" /etc/login.defs \
    && echo "ALWAYS_SET_PATH yes" >> /etc/login.defs \
    && chage --maxdays 30 $APP_USER \
    && passwd -l $APP_USER \
    # 保留：禁用不必要的系统用户
    && usermod -s /sbin/nologin sync \
    && usermod -s /sbin/nologin shutdown \
    && usermod -s /sbin/nologin halt \
    # 保留：设置会话超时
    && echo "export TMOUT=1800 readonly TMOUT" >> /etc/profile \
    # 保留：删除调试工具和不必要的文件
    && rm -rf /usr/bin/gdb* \
    && rm -rf /usr/share/gdb \
    && rm -rf /usr/share/gcc* \
    && rm -rf /usr/lib64/python3.11/bdb.py \
    && rm -rf /usr/lib64/python3.11/pdb.py \
    && rm -rf /usr/lib64/python3.11/timeit.py \
    && rm -rf /usr/lib64/python3.11/trace.py \
    && rm -rf /usr/lib64/python3.11/tracemalloc.py \
    && rm -rf /usr/share/licenses/glibc \
    && rm -rf /usr/share/locale/ar \
    && rm -rf /usr/share/locale/cpp \
    && yum remove gdb-gdbserver findutils passwd shadow -y \
    && yum clean all

# 修改：设置工作目录为应用目录（原来是 nginx 配置目录）
WORKDIR $APP_HOME

# 修改：暴露 MCP 服务端口（原来是 8080，改为 3000）
EXPOSE 3000

# 保留：切换到非 root 用户运行
USER $APP_USER

# 修改：启动 Node.js 应用（原来是启动 nginx）
CMD ["node", "src/index.js", "--sse"]
