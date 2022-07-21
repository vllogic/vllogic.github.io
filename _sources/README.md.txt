# 文档维护

## 将_build关联到gh-pages分支
`git worktree add _build gh-pages`

## 安装
`pip install -U Sphinx`
`pip install --upgrade myst-parser`
`pip install --upgrade sphinx_rtd_theme`

## 构建
`sphinx-build -b html . _build`