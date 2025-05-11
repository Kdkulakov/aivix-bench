from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'block_metadata',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('block_id', sa.String, nullable=False, index=True),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('category', sa.String),
        sa.Column('description', sa.Text),
        sa.Column('custom_description', sa.Text),
        sa.Column('tags', sa.ARRAY(sa.String)),
        sa.Column('user_id', sa.Integer),
    )

def downgrade():
    op.drop_table('block_metadata') 