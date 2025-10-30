"""add manager slug and chatlink owner

Revision ID: 3a2f1b
Revises: 13b613178fb8
Create Date: 2025-10-30 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3a2f1b'
down_revision = '13b613178fb8'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user') as batch_op:
        batch_op.add_column(sa.Column('slug', sa.String(length=64), nullable=True))
        batch_op.create_unique_constraint('uq_user_slug', ['slug'])

    with op.batch_alter_table('chat_link') as batch_op:
        batch_op.add_column(sa.Column('owner_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_chat_link_owner', 'user', ['owner_id'], ['id'])


def downgrade():
    with op.batch_alter_table('chat_link') as batch_op:
        batch_op.drop_constraint('fk_chat_link_owner', type_='foreignkey')
        batch_op.drop_column('owner_id')

    with op.batch_alter_table('user') as batch_op:
        batch_op.drop_constraint('uq_user_slug', type_='unique')
        batch_op.drop_column('slug')


